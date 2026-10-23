/* Scripted stand-ins for the Whisper and NLLB workers, which let the whole app run without downloading a model */

const TRANSCRIPT = [
  { index: 0, text: 'The quick brown fox.', start: 0, end: 2 },
  { index: 1, text: 'Jumps over the lazy dog.', start: 2, end: 4 },
];

export const TRANSCRIPT_TEXT = TRANSCRIPT.map(chunk => chunk.text).join(' ');

/* Ten seconds or so of speech, more than a laptop's screen holds at the largest size */
const LONG_TRANSCRIPT = [
  'Welcome to the weekly team meeting.',
  'Today we will go over the release plan, the open bugs and the results from the last round of testing.',
].map((text, index) => ({ index, text, start: index * 5, end: index * 5 + 5 }));

export const LONG_TRANSCRIPT_TEXT = LONG_TRANSCRIPT.map(chunk => chunk.text).join(' ');

/* Far more than the screen holds at any size, so the page has to scroll */
const HUGE_TRANSCRIPT = Array.from({ length: 20 }, () => LONG_TRANSCRIPT).flat()
  .map((chunk, index) => ({ ...chunk, index, start: index * 5, end: index * 5 + 5 }));

const WHISPER = {
  success: `
    post({ type: 'DOWNLOADING', file: 'encoder_model.onnx', loaded: 5, total: 10 });
    post({ type: 'LOADING', status: 'success' });
    post({ type: 'RESULT', results: ${JSON.stringify(TRANSCRIPT)} });
    post({ type: 'INFERENCE_DONE' });`,
  long: `
    post({ type: 'LOADING', status: 'success' });
    post({ type: 'RESULT', results: ${JSON.stringify(LONG_TRANSCRIPT)} });
    post({ type: 'INFERENCE_DONE' });`,
  huge: `
    post({ type: 'LOADING', status: 'success' });
    post({ type: 'RESULT', results: ${JSON.stringify(HUGE_TRANSCRIPT)} });
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
    post({ status: 'error', gen, error: 'Failed to load translation model. Please try again.' });`,
};

export const translateWorker = scenario => `
const post = message => self.postMessage(message);
self.addEventListener('message', event => {
  const { type, gen, text, tgt_lang } = event.data;
  if (type === 'cancel') return;
  ${TRANSLATE[scenario]}
});`;