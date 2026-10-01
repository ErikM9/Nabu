import { describe, it, expect } from 'vitest';
import { MessageTypes, LoadingStatus, LANGUAGES } from '../../src/utils/presets';

describe('message constants', () => {
  it('gives every worker message type its own value', () => {
    const values = Object.values(MessageTypes);

    expect(new Set(values).size).toBe(values.length);
  });

  it('gives every loading status its own value', () => {
    const values = Object.values(LoadingStatus);

    expect(new Set(values).size).toBe(values.length);
  });
});

describe('LANGUAGES', () => {
  const entries = Object.entries(LANGUAGES);

  it('offers the full NLLB-200 set of more than 200 languages', () => {
    expect(entries.length).toBeGreaterThan(200);
  });

  /* NLLB expects a three-letter language code joined to a four-letter script code */
  it('uses codes the NLLB model understands', () => {
    entries.forEach(([name, code]) => {
      expect(code, name).toMatch(/^[a-z]{3}_[A-Z][a-z]{3}$/);
    });
  });

  it('never repeats a code', () => {
    const codes = entries.map(([, code]) => code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each([
    ['English', 'eng_Latn'],
    ['French', 'fra_Latn'],
    ['Spanish', 'spa_Latn'],
    ['German', 'deu_Latn'],
    ['Hungarian', 'hun_Latn'],
    ['Japanese', 'jpn_Jpan'],
    ['Chinese (Simplified)', 'zho_Hans'],
    ['Modern Standard Arabic', 'arb_Arab']
  ])('maps %s to %s', (name, code) => {
    expect(LANGUAGES[name]).toBe(code);
  });
});