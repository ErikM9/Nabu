/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@xenova/transformers', () => ({ env: {}, pipeline: vi.fn() }));

/* Loads a fresh copy of the worker, capturing its message handler and everything it posts */
async function loadWorker() {
  vi.resetModules();
  const posted = [];
  let onMessage;
  globalThis.self = {
    addEventListener: (type, handler) => { onMessage = handler; },
    postMessage: message => posted.push(message),
  };
  const { pipeline } = await import('@xenova/transformers');
  await import('../../src/utils/translate.worker.js');
  return { posted, pipeline, send: data => onMessage({ data }) };
}

/* A translator that streams the given steps, with an optional hook between them */
const fakeTranslator = ({ steps = ['Bon', 'Bonjour'], betweenSteps = () => {}, error } = {}) => {
  const translator = vi.fn(async (text, { callback_function }) => {
    if (error) throw error;
    steps.forEach((step, i) => {
      if (i > 0) betweenSteps();
      callback_function([{ output_token_ids: step }]);
    });
    return [{ translation_text: steps.at(-1) }];
  });
  translator.tokenizer = { decode: ids => ids };
  return translator;
};

const job = gen => ({ gen, text: 'Hello', src_lang: 'eng_Latn', tgt_lang: 'fra_Latn' });

describe('translation worker', () => {
  it('forwards model download progress tagged with its job', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockImplementation(async (task, model, { progress_callback }) => {
      progress_callback({ status: 'progress', file: 'model.onnx', loaded: 1, total: 2 });
      return fakeTranslator();
    });

    await send(job(1));

    expect(posted[0]).toEqual({ status: 'progress', file: 'model.onnx', loaded: 1, total: 2, gen: 1 });
  });

  it('streams each step and then the finished translation', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeTranslator());

    await send(job(1));

    expect(posted).toEqual([
      { status: 'update', gen: 1, output: 'Bon' },
      { status: 'update', gen: 1, output: 'Bonjour' },
      { status: 'complete', gen: 1, output: [{ translation_text: 'Bonjour' }] },
    ]);
  });

  /* A cached model sends no progress, so without this the page would keep saying the model is loading */
  it('tells the page it is ready straight away when the model is already loaded', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeTranslator());
    await send(job(1));
    posted.length = 0;

    await send(job(2));

    expect(posted[0]).toEqual({ status: 'ready', gen: 2 });
    expect(pipeline).toHaveBeenCalledTimes(1);
  });

  it('stops a translation that is cancelled part-way, without reporting an error', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeTranslator({ betweenSteps: () => send({ type: 'cancel' }) }));

    await send(job(1));

    expect(posted).toEqual([{ status: 'update', gen: 1, output: 'Bon' }]);
  });

  it('reports a model that fails to load, then tries again from scratch', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(fakeTranslator());

    await send(job(1));
    await send(job(2));

    expect(posted[0]).toEqual({ status: 'error', gen: 1, error: 'Failed to load translation model. Please try again.' });
    expect(posted.at(-1)).toMatchObject({ status: 'complete', gen: 2 });
    expect(pipeline).toHaveBeenCalledTimes(2);
  });

  it('reports a failed translation but keeps the loaded model', async () => {
    const { posted, pipeline, send } = await loadWorker();
    pipeline.mockResolvedValue(fakeTranslator({ error: new Error('bad input') }));

    await send(job(1));
    await send(job(2));

    expect(posted[0]).toEqual({ status: 'error', gen: 1, error: 'Translation failed. Please try again.' });
    expect(pipeline).toHaveBeenCalledTimes(1);
  });

  it.each([['RangeError', new RangeError('heap')], ['TypeError', new TypeError('wasm')]])(
    'reloads the model after a %s, which can leave the WASM heap unusable',
    async (_name, error) => {
      const { pipeline, send } = await loadWorker();
      pipeline.mockResolvedValue(fakeTranslator({ error }));

      await send(job(1));
      await send(job(2));

      expect(pipeline).toHaveBeenCalledTimes(2);
    });
});