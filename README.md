# Nabu

![CI](https://github.com/ErikM9/Nabu/actions/workflows/ci.yml/badge.svg)

A browser-based speech transcription and translation app. Record or upload audio, transcribe it with Whisper, and translate the result to 200+ languages — all running locally in the browser via WebAssembly.

## Features

- **Record** directly from your microphone
- **Upload** audio files (MP3, WAV, WebM, OGG, M4A)
- **Transcribe** speech to text using Whisper (tiny.en)
- **Translate** to 200+ languages using NLLB-200
- **Works offline** after first load — models are cached in the browser
- **Copy or download** the transcription result

## Quick Start

```bash
npm install
npm run dev
```

## Tech Stack

- React 18 + Vite 4
- Tailwind CSS
- @xenova/transformers — runs Whisper and NLLB in-browser via ONNX Runtime
- Vitest + React Testing Library
- Playwright

## How It Works

Transcription and translation run in Web Workers so the UI stays responsive during inference. The Whisper worker is created fresh on each transcription run and terminated immediately when the user cancels, which guarantees no stale results can reach the UI after cancellation. The translation worker uses a singleton pipeline pattern — the NLLB model is loaded once and reused for subsequent translations without re-downloading. The translation worker also accepts a `cancel` message that aborts mid-inference, and automatically resets its pipeline singleton on WASM runtime errors (such as heap corruption after repeated cancel/retry cycles) so the next translation attempt always gets a clean session.

## Testing

### Unit Tests

Mock implementations of `AudioContext`, `MediaRecorder`, `Web Workers`, and browser APIs let the component tests run in jsdom without real ML inference.

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
```

**106 tests across 7 areas:**

| Area | Tests |
|------|-------|
| Presets | 19 |
| Header | 8 |
| Transcribe | 5 |
| Home | 18 |
| File | 14 |
| Info | 26 |
| App | 16 |

### E2E Tests

Playwright tests run against a production build (`npm run build && npm run preview`) so they reflect real bundle behaviour. File upload uses the label's file chooser event rather than `setInputFiles` directly, which is the correct approach for hidden inputs backed by React state.

```bash
npm run test:e2e         # Headless
npm run test:e2e:headed  # With browser UI
```

**32 tests across 8 areas:**

| Area | Tests |
|------|-------|
| Initial Load | 10 |
| Header | 2 |
| File Upload | 8 |
| Recording UI | 3 |
| UI Elements | 1 |
| Accessibility | 2 |
| Responsive Design | 4 |
| File View Icons | 2 |

### Run Everything

```bash
npm run test:all
```

## CI

GitHub Actions runs linting, unit tests, build, and E2E tests (Chromium) on every push and pull request to `main`.

## Project Structure

```
src/
├── assets/                 # Images and fonts
├── components/
│   ├── Header.jsx          # App title and mascot
│   ├── Home.jsx            # Record / upload landing screen
│   ├── File.jsx            # Audio preview before transcription
│   ├── Transcribe.jsx      # Loading screen during transcription
│   └── Info.jsx            # Results: transcription, translation, copy/download
├── utils/
│   ├── presets.js          # Shared constants and language list
│   ├── whisper.worker.js   # Loads Whisper, runs ASR inference, streams partial results to the main thread
│   └── translate.worker.js # Loads NLLB-200, handles translation with cancel support and WASM error recovery
├── App.jsx                 # State management and view routing
├── main.jsx                # React entry point
└── index.css               # Tailwind base + custom button and scrollbar styles
```

The `tests/` directory mirrors `src/` with a `unit/` subfolder for Vitest tests and an `e2e/` subfolder for Playwright tests.