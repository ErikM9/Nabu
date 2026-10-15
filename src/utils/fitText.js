import { useLayoutEffect } from 'react';

/* The sizes a result is tried at, in rem, from the one a short result reads best at down to the one a long result scrolls at */
export const SIZES = [1.875, 1.75, 1.625, 1.5, 1.375, 1.25, 1.125];

/* The height the browser shows, in the unit the page's minimum height uses, which on a phone leaves out the address bar */
const visibleHeight = () => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position: fixed; top: 0; height: 100vh; height: 100dvh; visibility: hidden; pointer-events: none;';
  document.body.appendChild(probe);
  const height = probe.offsetHeight;
  probe.remove();
  return height;
};

/* Sets the element at the largest size the page holds without scrolling, and the smallest when none fits */
export const fitText = element => {
  const room = visibleHeight();
  for (const size of SIZES) {
    element.style.fontSize = `${size}rem`;
    if (document.documentElement.scrollHeight <= room) return;
  }
};

/* Fits the element again whenever its text changes, the window is resized or the font arrives, as each moves where the lines end */
export const useFitText = (ref, text) => {
  useLayoutEffect(() => {
    const element = ref.current;
    let mounted = true;
    const fit = () => { if (mounted) fitText(element); };
    fit();
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    return () => {
      mounted = false;
      window.removeEventListener('resize', fit);
    };
  }, [ref, text]);
};