import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

/* Singleton wrapper so the NLLB pipeline loads once and is reused across translations */
class TranslationPipeline {
  static task = 'translation';
  static model = 'Xenova/nllb-200-distilled-600M';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }

  static reset() {
    this.instance = null;
  }
}

/* Tracks the active translation job so a cancel can stop the in-progress callback */
let currentGen = null;

self.addEventListener('message', async event => {
  if (event.data.type === 'cancel') {
    currentGen = null;
    return;
  }

  const { gen, text, src_lang, tgt_lang } = event.data;
  currentGen = gen;

  /* Download progress is only forwarded on the run that loads the model */
  const alreadyLoaded = TranslationPipeline.instance !== null;
  const progressCallback = alreadyLoaded ? null : x => self.postMessage({ ...x, gen });

  let translator;
  try {
    translator = await TranslationPipeline.getInstance(progressCallback);
  } catch {
    self.postMessage({ status: 'error', gen, error: 'Failed to load translation model. Please try again.' });
    return;
  }

  /* A model that is already loaded sends no progress events, so the page is told directly that translation has started */
  if (alreadyLoaded) self.postMessage({ status: 'ready', gen });

  try {
    const output = await translator(text, {
      tgt_lang,
      src_lang,
      callback_function: x => {
        /* Bail out mid-inference if the user cancelled */
        if (currentGen !== gen) throw new Error('cancelled');
        self.postMessage({
          status: 'update',
          gen,
          output: translator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true }),
        });
      },
    });

    if (currentGen === gen) {
      self.postMessage({ status: 'complete', gen, output });
    }
  } catch (err) {
    if (err.message === 'cancelled') return;
    if (currentGen === gen) {
      /* A runtime fault can leave the WASM heap unusable, so the pipeline is dropped and the next attempt loads it again */
      if (err instanceof RangeError || err instanceof TypeError) {
        TranslationPipeline.reset();
      }
      self.postMessage({ status: 'error', gen, error: 'Translation failed. Please try again.' });
    }
  }
});