import { useState, useEffect, useRef } from 'react';
import { LANGUAGES } from '../utils/presets';
import PropTypes from 'prop-types';

/* Target language dropdown with a hand-rolled scrollbar that keeps list items centred */
function LanguageSelect({ toLanguage, setToLanguage, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [showThumb, setShowThumb] = useState(false);
  const thumbRef = useRef(null);
  const isDragging = useRef(false);
  const TRACK_W = 6;
  const MAX_H = 176;

  const selectedLabel =
    toLanguage === 'Select language'
      ? 'Select language'
      : Object.entries(LANGUAGES).find(([, code]) => code === toLanguage)?.[0] ?? toLanguage;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const ARROW_H = 10;
  /* Recalculate the scrollbar thumb size and position from the list scroll state */
  const updateThumb = () => {
    const el = listRef.current;
    if (!el) return;
    const visible = el.clientHeight;
    const total = el.scrollHeight;
    const trackH = visible - 2 * ARROW_H;
    if (total <= visible) { setShowThumb(false); return; }
    setShowThumb(true);
    const h = Math.max((visible / total) * trackH, 20);
    const rawTop = (el.scrollTop / (total - visible)) * (trackH - h);
    setThumbHeight(h);
    setThumbTop(Math.min(Math.max(rawTop, 0), trackH - h));
  };

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const id = setTimeout(() => {
      updateThumb();
      list?.addEventListener('scroll', updateThumb);
    }, 0);
    return () => {
      clearTimeout(id);
      list?.removeEventListener('scroll', updateThumb);
    };
  }, [open]);

  const onThumbPointerDown = (e) => {
    e.preventDefault();
    const el = listRef.current;
    if (!el) return;
    const startY = e.clientY;
    const startScroll = el.scrollTop;
    const trackH = el.clientHeight - 2 * ARROW_H;
    const scrollRange = el.scrollHeight - el.clientHeight;
    const thumbRange = trackH - thumbHeight;
    const ratio = thumbRange > 0 ? scrollRange / thumbRange : 1;

    /* Full-screen overlay absorbs pointer events during drag to suppress hover styles underneath */
    isDragging.current = true;
    if (thumbRef.current) thumbRef.current.style.background = 'rgba(153, 246, 228, 0.9)';

    const overlay = document.createElement('div');
    overlay.id = '__drag-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%',
      zIndex: '99999', cursor: 'default',
    });
    document.body.appendChild(overlay);

    const onMove = (ev) => {
      el.scrollTop = Math.min(
        Math.max(0, startScroll + (ev.clientY - startY) * ratio),
        scrollRange
      );
    };
    const onUp = () => {
      isDragging.current = false;
      if (thumbRef.current) thumbRef.current.style.background = 'rgba(153, 246, 228, 0.6)';
      document.getElementById('__drag-overlay')?.remove();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onTrackClick = (e) => {
    if (e.target !== e.currentTarget) return;
    const el = listRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.scrollTop = ((e.clientY - rect.top) / el.clientHeight) * el.scrollHeight - el.clientHeight / 2;
  };

  return (
    <div
      ref={ref}
      className="relative flex-1 min-w-0 max-w-[20rem]"
      aria-label="Target language"
    >
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-center
          px-4 py-2.5 text-xl
          bg-white
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          relative transition-opacity duration-150
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate min-w-0 px-3 ${toLanguage === 'Select language' ? 'text-gray-400' : 'text-gray-700'}`}>
          {selectedLabel}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-base absolute right-4 transition-transform duration-200 ${
            open ? 'rotate-180 text-teal-200' : 'text-teal-200'
          }`}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '5%',
          width: '90%',
          height: 0.5,
          background: 'rgba(153, 246, 228, 0.5)',
          zIndex: 11,
        }} />
      )}

      {open && (
        <div
          className="absolute z-10 w-full bg-white shadow-lg"
          style={{ maxHeight: `${MAX_H}px`, overflow: 'hidden' }}
        >
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Target language"
            style={{
              maxHeight: `${MAX_H}px`,
              overflowY: 'scroll',
              width: 'calc(100% + 20px)',
              paddingRight: '20px',
              boxSizing: 'border-box',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {Object.entries(LANGUAGES).map(([name, code]) => {
              const isSelected = toLanguage === code;
              return (
                <li
                  key={code}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ccfbf1'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = isSelected ? '#f0fdfa' : ''; }}
                  className={`py-2 text-xl text-center cursor-pointer transition-colors duration-100 ${
                    isSelected ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => { setToLanguage(code); setOpen(false); }}
                >
                  {name}
                </li>
              );
            })}
          </ul>

          {showThumb && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 2.5,
              width: TRACK_W,
              height: '100%',
              background: 'rgba(204, 251, 241, 0.15)',
              cursor: 'default',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div
                onClick={() => { if (listRef.current) listRef.current.scrollTop -= 40; }}
                style={{ width: '100%', height: ARROW_H, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', flexShrink: 0 }}
              >
                <svg width="6" height="4" viewBox="0 0 6 4"><path d="M3 0L6 4H0L3 0Z" fill="rgba(153,246,228,0.85)"/></svg>
              </div>

              <div onClick={onTrackClick} style={{ flex: 1, width: '100%', position: 'relative' }}>
                <div
                  ref={thumbRef}
                  onPointerDown={onThumbPointerDown}
                  style={{
                    position: 'absolute',
                    top: thumbTop,
                    left: 0,
                    width: '100%',
                    height: thumbHeight,
                    borderRadius: 999,
                    background: isDragging.current ? 'rgba(153, 246, 228, 0.9)' : 'rgba(153, 246, 228, 0.6)',
                    cursor: 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isDragging.current) e.currentTarget.style.background = 'rgba(153, 246, 228, 0.9)'; }}
                  onMouseLeave={e => { if (!isDragging.current) e.currentTarget.style.background = 'rgba(153, 246, 228, 0.6)'; }}
                />
              </div>

              <div
                onClick={() => { if (listRef.current) listRef.current.scrollTop += 40; }}
                style={{ width: '100%', height: ARROW_H, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', flexShrink: 0 }}
              >
                <svg width="6" height="4" viewBox="0 0 6 4"><path d="M3 4L0 0H6L3 4Z" fill="rgba(153,246,228,0.85)"/></svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

LanguageSelect.propTypes = {
  toLanguage: PropTypes.string.isRequired,
  setToLanguage: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

function Translate({
  textElement,
  toLanguage,
  translating,
  generateTranslation,
  cancelTranslation,
  downloadProgress,
  error,
  setToLanguage,
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-nowrap gap-3 items-center justify-center">
        <LanguageSelect
          toLanguage={toLanguage}
          setToLanguage={setToLanguage}
          disabled={translating}
        />

        {translating ? (
          <button
            onClick={cancelTranslation}
            className="specialBtn shrink-0 whitespace-nowrap px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center justify-center gap-3"
            aria-label="Cancel translation"
          >
            <i className="fa-solid fa-xmark" />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            onClick={generateTranslation}
            className="specialBtn shrink-0 whitespace-nowrap px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center gap-3 disabled:cursor-not-allowed"
            disabled={toLanguage === 'Select language'}
            aria-label="Start translation"
          >
            <i className="fa-solid fa-language" />
            <span>Translate</span>
          </button>
        )}
      </div>

      {downloadProgress && (
        <div className="flex flex-col gap-1 text-center">
          <p className="text-xl text-teal-300">{downloadProgress}</p>
          <p className="text-base text-teal-300">
            The translation model (~2.4 GB) only downloads once. Future translations will rely on the cached files.
          </p>
          {translating && (
            <p className="text-base text-teal-300">
              If the download stalls, click Cancel and retry. Closing other tabs frees up memory and helps significantly.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-lg text-red-400 text-center" role="alert">
          {error}
        </p>
      )}

      {textElement && !translating && (
        <div className="text-xl text-teal-300 whitespace-pre-wrap leading-relaxed text-center">
          {textElement}
        </div>
      )}
    </div>
  );
}

Translate.propTypes = {
  textElement: PropTypes.string,
  toLanguage: PropTypes.string.isRequired,
  translating: PropTypes.bool.isRequired,
  generateTranslation: PropTypes.func.isRequired,
  cancelTranslation: PropTypes.func.isRequired,
  downloadProgress: PropTypes.string,
  error: PropTypes.string,
  setToLanguage: PropTypes.func.isRequired,
};

/* Shows the transcription, handles translation, and provides copy/download options */
export default function Info({ output, onReset, translateWorkerRef = { current: { addEventListener: () => {}, removeEventListener: () => {}, postMessage: () => {}, terminate: () => {} } } }) {
  const [tab, setTab] = useState('transcription');
  const [translation, setTranslation] = useState('');
  const [toLanguage, setToLanguage] = useState('Select language');
  const [translating, setTranslating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [error, setError] = useState('');
  const worker = translateWorkerRef;
  const workerMessageHandler = useRef(null);
  const generationRef = useRef(0);

  /* Bump the generation counter so queued messages from the old run are discarded */
  const cancelTranslation = () => {
    generationRef.current += 1;
    worker.current?.postMessage({ type: 'cancel' });
    setTranslating(false);
    setTranslation('');
    setDownloadProgress('');
    setError('');
  };

  useEffect(() => {
    const w = worker.current;
    const onMessage = (e) => {
      const { status, output, gen } = e.data;

      if (gen !== undefined && gen !== generationRef.current) return;

      switch (status) {
        case 'initiate':
          setDownloadProgress('Loading translation model…');
          setError('');
          break;

        case 'progress': {
          const { file, loaded, total } = e.data;
          if (total > 0) {
            const percent = Math.round((loaded / total) * 100);
            setDownloadProgress(`Downloading ${file}… ${percent}%`);
          }
          break;
        }

        case 'ready':
          setDownloadProgress('Translating…');
          break;

        case 'update':
          setTranslation(output);
          break;

        case 'complete':
          setTranslating(false);
          setDownloadProgress('');
          break;

        case 'error':
          setError(e.data.error ?? 'Translation failed. Please try again.');
          setTranslating(false);
          setDownloadProgress('');
          break;

        default:
          break;
      }
    };

    workerMessageHandler.current = onMessage;
    w.addEventListener('message', onMessage);
    return () => w?.removeEventListener('message', onMessage);
  }, [worker]);

  const textElement =
    tab === 'transcription'
      ? output.map((v) => v.text).join(' ').trim()
      : translation;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textElement);
    } catch {
      setError('Failed to copy to clipboard.');
    }
  };

  /* Build a timestamped filename and trigger a browser download */
  const handleDownload = () => {
    if (!textElement) return;

    const lang = toLanguage === 'Select language' ? 'en' : toLanguage.split('_')[0];
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Nabu_${tab}_${lang}_${timestamp}.txt`;

    const blob = new Blob([textElement], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* Each translation job gets a generation number so stale worker responses can be filtered out */
  const generateTranslation = () => {
    if (translating || toLanguage === 'Select language') return;

    generationRef.current += 1;
    setTranslating(true);
    setTranslation('');
    setError('');
    setDownloadProgress('Loading translation model…');

    worker.current?.postMessage({
      gen: generationRef.current,
      text: output.map((v) => v.text).join(' '),
      src_lang: 'eng_Latn',
      tgt_lang: toLanguage,
    });
  };

  return (
    <main className="flex-1 px-8 py-6 flex flex-col gap-6 text-center justify-center pb-14 w-full">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl font-medium text-teal-300">
          Here is your result:
        </h1>
      </div>

      <div className="flex flex-nowrap whitespace-nowrap gap-3 justify-center">
        <button
          onClick={() => setTab('transcription')}
          className={`specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 ${
            tab === 'transcription' ? 'selected' : ''
          }`}
        >
          Transcription
        </button>

        <button
          onClick={() => setTab('translation')}
          className={`specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 ${
            tab === 'translation' ? 'selected' : ''
          }`}
        >
          Translation
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        {tab === 'transcription' ? (
          <div className="text-xl text-teal-300 leading-relaxed whitespace-pre-wrap">
            {textElement || 'No transcription available.'}
          </div>
        ) : (
          <Translate
            textElement={textElement}
            toLanguage={toLanguage}
            translating={translating}
            generateTranslation={generateTranslation}
            cancelTranslation={cancelTranslation}
            downloadProgress={downloadProgress}
            error={error}
            setToLanguage={setToLanguage}
          />
        )}
      </div>

      <div className="flex flex-nowrap whitespace-nowrap items-center justify-center gap-2">
        <button
          onClick={handleCopy}
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center gap-3"
        >
          <i className="fa-solid fa-link" />
          <span>Copy</span>
        </button>

        <button
          onClick={handleDownload}
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center gap-3"
          disabled={!textElement}
        >
          <i className="fa-solid fa-download" />
          <span>Download</span>
        </button>

        <button
          onClick={onReset}
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center gap-3"
        >
          <i className="fa-solid fa-arrow-rotate-left" />
          <span>Restart</span>
        </button>
      </div>
    </main>
  );
}

Info.propTypes = {
  output: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  onReset: PropTypes.func.isRequired,
  translateWorkerRef: PropTypes.shape({ current: PropTypes.object }),
};