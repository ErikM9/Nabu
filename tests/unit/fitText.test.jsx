import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import PropTypes from 'prop-types';
import { fitText, useFitText, SIZES } from '../../src/utils/fitText';

const SCREEN = 800;
const nativeOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

/* jsdom lays nothing out, so the page's height is modelled as growing with the size the result is set at */
let heightAt = () => SCREEN;
let result = null;
const resultSize = () => parseFloat((result ?? document.querySelector('[data-result]'))?.style.fontSize ?? '0');
/* A page exactly as tall as the screen fits, and a pixel more would scroll */
const fitsUpTo = limit => size => (size > limit ? SCREEN + 1 : SCREEN);

beforeEach(() => {
  heightAt = () => SCREEN;
  result = null;
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, get: () => heightAt(resultSize()) });
  /* The probe, the one fixed element, is as tall as the screen, and every other element as flat as jsdom leaves it */
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() { return this.style.position === 'fixed' ? SCREEN : 0; },
  });
});

afterEach(() => {
  delete document.documentElement.scrollHeight;
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', nativeOffsetHeight);
  delete document.fonts;
});

function Result({ text }) {
  const ref = useRef(null);
  useFitText(ref, text);
  return <p ref={ref} data-result>{text}</p>;
}

Result.propTypes = { text: PropTypes.string.isRequired };

describe('fitText', () => {
  it('tries the sizes from the largest down and keeps the first the page holds', () => {
    heightAt = fitsUpTo(1.5);
    result = document.createElement('p');

    fitText(result);

    expect(result.style.fontSize).toBe('1.5rem');
  });

  it('settles on the smallest size when the page holds none of them, and leaves the rest to scrolling', () => {
    heightAt = () => SCREEN + 1;
    result = document.createElement('p');

    fitText(result);

    expect(result.style.fontSize).toBe(`${SIZES.at(-1)}rem`);
  });

  it('leaves no probe behind on the page', () => {
    result = document.createElement('p');

    fitText(result);

    expect(document.body.children).toHaveLength(0);
  });
});

describe('useFitText', () => {
  it('sizes the text as soon as it is shown', () => {
    heightAt = fitsUpTo(1.625);

    render(<Result text="A short result." />);

    expect(resultSize()).toBe(1.625);
  });

  it('sizes the text again when it changes', () => {
    heightAt = fitsUpTo(1.875);
    const { rerender } = render(<Result text="Short." />);
    expect(resultSize()).toBe(1.875);

    heightAt = fitsUpTo(1.25);
    rerender(<Result text="A much longer result, which needs more lines." />);

    expect(resultSize()).toBe(1.25);
  });

  it('sizes the text again when the window is resized', () => {
    heightAt = fitsUpTo(1.875);
    render(<Result text="Short." />);

    heightAt = fitsUpTo(1.375);
    act(() => window.dispatchEvent(new Event('resize')));

    expect(resultSize()).toBe(1.375);
  });

  it('sizes the text again once the font has arrived, as its letters are not the width of the stand-in', async () => {
    let fontsLoaded;
    document.fonts = { ready: new Promise(resolve => { fontsLoaded = resolve; }) };
    heightAt = fitsUpTo(1.25);
    render(<Result text="Short." />);
    expect(resultSize()).toBe(1.25);

    heightAt = fitsUpTo(1.75);
    await act(async () => { fontsLoaded(); await document.fonts.ready; });

    expect(resultSize()).toBe(1.75);
  });

  it('leaves the text alone once it has gone, whether the window is resized or the font arrives', async () => {
    let fontsLoaded;
    document.fonts = { ready: new Promise(resolve => { fontsLoaded = resolve; }) };
    heightAt = fitsUpTo(1.875);
    const { unmount } = render(<Result text="Short." />);
    result = document.querySelector('[data-result]');
    unmount();

    heightAt = fitsUpTo(1.25);
    window.dispatchEvent(new Event('resize'));
    await act(async () => { fontsLoaded(); await document.fonts.ready; });

    expect(result.style.fontSize).toBe('1.875rem');
  });
});