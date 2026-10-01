/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@xenova/transformers', () => ({ env: {}, pipeline: vi.fn() }));

async function loadWorker() {
  vi.resetModules();
  const posted = [];
  let onMessage;
  globalThis.self = {
    addEventListener: (type, handler) => { onMessage = handler; },
    postMessage: message => posted.push(message),
  };
  const { pipeline } = await import('@xenova/transformers');
  await import('../../src/utils/whisper.worker.js');
  return { posted, pipeline, send: data => onMessage({ data }) };
}

/* A speech recogniser that makes the given number of decoding steps and then reports the chunks given */
const fakeRecogniser = ({ steps = 0, chunks = [], error } = {}) => {
  const asr = vi.fn(async (audio, { callback_function, chunk_callback }) => {
    if (error) throw error;
    for (let i = 0; i < steps; i += 1) callback_function([{ output_token_ids: `step ${i + 1}` }]);
    chunk_callback({ tokens: [] });
  });
  asr.model = { config: { max_source_positions: 1500 } };
  asr.processor = { feature_extractor: { config: { chunk_length: 30 } } };
  asr.tokenizer = { decode: ids => ids, _decode_asr: () => ['', { chunks }] };
  return asr;
};

const request = { type: 'INFERENCE_REQUEST', audio: new Float32Array(16000) };

describe('transcription worker', () => {
  it('reports loading, success, the transcript and then that it is done', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeRecogniser({ chunks: [{ text: ' Hello there ', timestamp: [0.2, 1.4] }] }));

    await send(request);

    expect(posted.map(message => message.type)).toEqual(['LOADING', 'LOADING', 'RESULT', 'INFERENCE_DONE']);
    expect(posted[0].status).toBe('loading');
    expect(posted[1].status).toBe('success');
    expect(posted[2].results).toEqual([{ index: 0, text: 'Hello there', start: 0, end: 1 }]);
  });

  it('passes on download progress for real transfers only', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockImplementation(async (task, model, { progress_callback }) => {
      progress_callback({ status: 'initiate', file: 'config.json' });
      progress_callback({ status: 'progress', file: 'encoder_model.onnx', progress: 50, loaded: 5, total: 10 });
      progress_callback({ status: 'progress', file: 'cached.onnx', progress: 100, loaded: 0, total: 0 });
      return fakeRecogniser();
    });

    await send(request);

    expect(posted.filter(message => message.type === 'DOWNLOADING')).toEqual([
      { type: 'DOWNLOADING', file: 'encoder_model.onnx', progress: 50, loaded: 5, total: 10 },
    ]);
  });

  it('fills in a missing end time from the stride length', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeRecogniser({ chunks: [{ text: 'Cut off', timestamp: [3, null] }] }));

    await send(request);

    expect(posted.find(message => message.type === 'RESULT').results[0]).toMatchObject({ start: 3, end: 8 });
  });

  it('sends a live preview on every tenth decoding step', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeRecogniser({ steps: 25 }));

    await send(request);

    const previews = posted.filter(message => message.type === 'RESULT_PARTIAL');
    expect(previews.map(message => message.result.text)).toEqual(['step 10', 'step 20']);
  });

  it('reports a model that fails to load', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockRejectedValue(new Error('offline'));

    await send(request);

    expect(posted.at(-1)).toEqual({ type: 'LOADING', status: 'error', message: 'offline' });
    expect(posted.some(message => message.type === 'INFERENCE_DONE')).toBe(false);
  });

  it('reports a model that loads without its weights', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue({});

    await send(request);

    expect(posted.at(-1)).toEqual({ type: 'LOADING', status: 'error', message: 'Pipeline model failed to load' });
  });

  it('reports a failure during transcription', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeRecogniser({ error: new Error('out of memory') }));

    await send(request);

    expect(posted.at(-1)).toEqual({ type: 'LOADING', status: 'error', message: 'out of memory' });
  });

  it('loads the model once for requests that arrive while it is still loading', async () => {
    const { pipeline, send } = await loadWorker();
    let finishLoading;
    pipeline.mockImplementation(() => new Promise(resolve => { finishLoading = () => resolve(fakeRecogniser()); }));

    const first = send(request);
    const second = send(request);
    finishLoading();
    await Promise.all([first, second]);

    expect(pipeline).toHaveBeenCalledTimes(1);
  });

  it('ignores messages that are not transcription requests', async () => {
    const { posted, send } = await loadWorker();

    await send({ type: 'SOMETHING_ELSE' });

    expect(posted).toEqual([]);
  });
});