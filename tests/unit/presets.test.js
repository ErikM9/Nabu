import { describe, it, expect } from 'vitest';
import { MessageTypes, LoadingStatus, ModelNames, LANGUAGES } from '../../src/utils/presets';

/* Sanity-checks the shared constants and language list */
describe('MessageTypes', () => {
  it('has exactly 6 message types', () => {
    expect(Object.keys(MessageTypes)).toHaveLength(6);
  });
});

describe('LoadingStatus', () => {
  it('has exactly 3 statuses', () => {
    expect(Object.keys(LoadingStatus)).toHaveLength(3);
  });
});

describe('ModelNames', () => {
  it('has exactly 6 models', () => {
    expect(Object.keys(ModelNames)).toHaveLength(6);
  });
  it('all model names start with openai/whisper', () => {
    Object.values(ModelNames).forEach(model => {
      expect(model).toMatch(/^openai\/whisper/);
    });
  });
});

describe('LANGUAGES', () => {
  it('has English', () => {
    expect(LANGUAGES['English']).toBe('eng_Latn');
  });
  it('has French', () => {
    expect(LANGUAGES['French']).toBe('fra_Latn');
  });
  it('has Spanish', () => {
    expect(LANGUAGES['Spanish']).toBe('spa_Latn');
  });
  it('has German', () => {
    expect(LANGUAGES['German']).toBe('deu_Latn');
  });
  it('has Japanese', () => {
    expect(LANGUAGES['Japanese']).toBe('jpn_Jpan');
  });
  it('has Chinese Simplified', () => {
    expect(LANGUAGES['Chinese (Simplified)']).toBe('zho_Hans');
  });
  it('has Chinese Traditional', () => {
    expect(LANGUAGES['Chinese (Traditional)']).toBe('zho_Hant');
  });
  it('has Arabic', () => {
    expect(LANGUAGES['Modern Standard Arabic']).toBe('arb_Arab');
  });
  it('has Russian', () => {
    expect(LANGUAGES['Russian']).toBe('rus_Cyrl');
  });
  it('has Portuguese', () => {
    expect(LANGUAGES['Portuguese']).toBe('por_Latn');
  });
  it('has Hindi', () => {
    expect(LANGUAGES['Hindi']).toBe('hin_Deva');
  });
  it('has Korean', () => {
    expect(LANGUAGES['Korean']).toBe('kor_Hang');
  });
  it('has over 200 languages', () => {
    expect(Object.keys(LANGUAGES).length).toBeGreaterThan(200);
  });
  it('all language codes follow format', () => {
    Object.values(LANGUAGES).forEach(code => {
      expect(code).toMatch(/^[a-z]{3}_[A-Za-z]{4}$/);
    });
  });
  it('all language names are non-empty strings', () => {
    Object.keys(LANGUAGES).forEach(name => {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });
});