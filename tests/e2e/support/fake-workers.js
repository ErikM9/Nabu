/* Scripted stand-ins for the Whisper and NLLB workers, so the whole app can be driven without downloading a model */

const TRANSCRIPT = [
  { index: 0, text: 'The quick brown fox.', start: 0, end: 2 },
  { index: 1, text: 'Jumps over the lazy dog.', start: 2, end: 4 },
];

export const TRANSCRIPT_TEXT = TRANSCRIPT.map(chunk => chunk.text).join(' ');

const WHISPER = {
  success: `
    post({ type: 'DOWNLOADING', file: 'encoder_model.onnx', loaded: 5, total: 10 });
    post({ type: 'LOADING', status: 'success' });
    post({ type: 'RESULT', results: ${JSON.stringify(TRANSCRIPT)} });
    post({ type: 'INFERENCE_DONE' });`,
  echo: `
    post({ type: 'LOADING', status: 'success' });
    post({ type: 'RESULT', results: [{ index: 0, text: 'Received ' + audio.length + ' samples', start: 0, end: 1 }] });
    post({ type: 'INFERENCE_DONE' });`,
  slow: `
    post({ type: 'DOWNLOADING', file: 'encoder_model.onnx', loaded: 5, total: 10 });`,
  modelError: `
    post({ type: 'LOADING', status: 'error', message: 'network' });`,
  noSpeech: `
    post({ type: 'LOADING', status: 'success' });
    post({ type: 'INFERENCE_DONE' });`,
};

export const whisperWorker = scenario => scenario === 'crash'
  ? `throw new Error('The worker script failed to start');`
  : `
const post = message => self.postMessage(message);
self.addEventListener('message', event => {
  if (event.data.type !== 'INFERENCE_REQUEST') return;
  const audio = event.data.audio;
  ${WHISPER[scenario]}
});`;

const TRANSLATE = {
  success: `
    post({ status: 'initiate', gen, file: 'model.onnx' });
    post({ status: 'progress', gen, file: 'model.onnx', loaded: 1, total: 4 });
    post({ status: 'ready', gen });
    post({ status: 'update', gen, output: '[' + tgt_lang + ']' });
    post({ status: 'complete', gen, output: [{ translation_text: '[' + tgt_lang + '] ' + text }] });`,
  slow: `
    post({ status: 'initiate', gen, file: 'model.onnx' });
    post({ status: 'progress', gen, file: 'model.onnx', loaded: 1, total: 4 });`,
  error: `
    post({ status: 'error', gen, error: 'Translation failed. Please try again.' });`,
};

export const translateWorker = scenario => `
const post = message => self.postMessage(message);
self.addEventListener('message', event => {
  const { type, gen, text, tgt_lang } = event.data;
  if (type === 'cancel') return;
  ${TRANSLATE[scenario]}
});`;