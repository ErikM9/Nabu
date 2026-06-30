import { pipeline, env } from '@xenova/transformers';
import { MessageTypes } from './presets';

env.allowLocalModels = false;
env.useBrowserCache = true;

/* Singleton that loads the Whisper pipeline once and queues concurrent requests */
class TranscriptionPipeline {
  static task = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-tiny.en';
  static instance = null;
  static loading = false;
  static progressCallback = null;
  static queue = [];

  static async getInstance(progress_callback = null) {
    if (this.instance) return this.instance;
    if (progress_callback) this.progressCallback = progress_callback;

    /* Queue the caller if a load is already in progress and resolve when it finishes */
    if (this.loading) {
      return new Promise((resolve, reject) => this.queue.push({ resolve, reject }));
    }

    this.loading = true;
    try {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback: this.progressCallback,
      });
      const waiting = this.queue;
      this.queue = [];
      this.loading = false;
      waiting.forEach(({ resolve }) => resolve(this.instance));
      return this.instance;
    } catch (err) {
      const waiting = this.queue;
      this.queue = [];
      this.loading = false;
      waiting.forEach(({ reject }) => reject(err));
      throw err;
    }
  }
}

self.addEventListener('message', async event => {
  const { type, audio } = event.data;
  if (type === MessageTypes.INFERENCE_REQUEST) await transcribe(audio);
});

async function transcribe(audio) {
  sendLoadingMessage('loading');

  let asr;
  try {
    asr = await TranscriptionPipeline.getInstance(onModelProgress);
    if (!asr?.model) throw new Error('Pipeline model failed to load');
  } catch (err) {
    sendLoadingMessage('error', err?.message);
    return;
  }

  sendLoadingMessage('success');

  const stride_length_s = 5;
  const tracker = new GenerationTracker(asr, stride_length_s);

  try {
    await asr(audio, {
      top_k: 0,
      do_sample: false,
      chunk_length: 30,
      stride_length_s,
      return_timestamps: true,
      callback_function: tracker.callbackFunction.bind(tracker),
      chunk_callback: tracker.chunkCallback.bind(tracker),
    });
    tracker.sendFinalResult();
  } catch (err) {
    sendLoadingMessage('error', err?.message);
  }
}

/* Only report download progress for actual network transfers */
function onModelProgress(data) {
  if (data.status === 'progress' && data.total > 0) {
    sendDownloadingMessage(data.file, data.progress, data.loaded, data.total);
  }
}

function sendLoadingMessage(status, message) {
  self.postMessage({ type: MessageTypes.LOADING, status, ...(message ? { message } : {}) });
}

function sendDownloadingMessage(file, progress, loaded, total) {
  self.postMessage({ type: MessageTypes.DOWNLOADING, file, progress, loaded, total });
}

/* Tracks chunks produced by Whisper's streaming decoder and assembles them */
class GenerationTracker {
  constructor(pipeline, stride_length_s) {
    this.pipeline = pipeline;
    this.stride_length_s = stride_length_s;
    this.chunks = [];
    this.processed_chunks = [];
    this.callbackFunctionCounter = 0;

    const chunkLength = pipeline?.processor?.feature_extractor?.config?.chunk_length;
    const maxSrcPos = pipeline?.model?.config?.max_source_positions;
    this.time_precision = chunkLength && maxSrcPos ? chunkLength / maxSrcPos : undefined;
  }

  sendFinalResult() {
    self.postMessage({ type: MessageTypes.INFERENCE_DONE });
  }

  callbackFunction(beams) {
    this.callbackFunctionCounter++;
    /* Sample every 10 callbacks to reduce message frequency */
    if (this.callbackFunctionCounter % 10 !== 0) return;
    const bestBeam = beams?.[0];
    if (!bestBeam) return;
    const text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
      skip_special_tokens: true,
    });
    self.postMessage({
      type: MessageTypes.RESULT_PARTIAL,
      result: { text, start: this.getLastChunkTimestamp(), end: undefined },
    });
  }

  chunkCallback(data) {
    this.chunks.push(data);
    const decodeFn = this.pipeline?.tokenizer?._decode_asr;
    if (typeof decodeFn !== 'function' || this.time_precision == null) return;

    const [, { chunks }] = decodeFn.call(this.pipeline.tokenizer, this.chunks, {
      time_precision: this.time_precision,
      return_timestamps: true,
      force_full_sequence: false,
    });

    this.processed_chunks = (chunks || []).map((chunk, index) => this.processChunk(chunk, index));
    self.postMessage({
      type: MessageTypes.RESULT,
      results: this.processed_chunks,
      isDone: false,
      completedUntilTimestamp: this.getLastChunkTimestamp(),
    });
  }

  getLastChunkTimestamp() {
    if (!this.processed_chunks.length) return 0;
    const last = this.processed_chunks[this.processed_chunks.length - 1];
    return typeof last?.end === 'number' ? last.end : 0;
  }

  processChunk(chunk, index) {
    const { text = '', timestamp = [0, 0] } = chunk || {};
    const [start, end] = timestamp;
    const startRounded = Math.round(start || 0);
    return {
      index,
      text: String(text).trim(),
      start: startRounded,
      end: Math.round(end) || Math.round(startRounded + 0.9 * this.stride_length_s),
    };
  }
}