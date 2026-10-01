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

Vitest and React Testing Library run the components in jsdom. Workers are replaced by `FakeWorker` (`tests/support/fake-worker.js`), which records what the page sends and lets each test answer message by message, so the transcription and translation flows are driven step by step with no hidden auto-replies. The two worker scripts are tested on their own in a Node environment, with `@xenova/transformers` mocked.

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage and thresholds
```

**96 tests across 9 files:**

| Area | Tests |
|------|-------|
| App (view flow, errors, cancel, retry) | 16 |
| Home (upload, recording, auto-stop) | 13 |
| File | 8 |
| Info (copy, download, language picker, translation) | 25 |
| Header and Transcribe | 4 |
| Presets | 13 |
| Whisper worker | 9 |
| Translation worker | 8 |

`@testing-library/dom` is pinned as a dev dependency so React Testing Library and user-event share one copy. With two copies, user-event's interactions escape React's `act()` and every test prints warnings.

### E2E Tests

Playwright runs against a production build (`npm run build && npm run preview`). The Whisper and NLLB workers are replaced with scripted fakes at the network level (`tests/e2e/support/fake-workers.js`), so every flow runs end to end without downloading a model: transcription, translation, copying, downloading, cancelling and each error path. Chromium's fake capture device stands in for a microphone, and any request that would leave the preview server fails the test.

```bash
npm run test:e2e         # Headless
npm run test:e2e:headed  # With browser UI
```

**34 tests across 6 files:**

| Area | Tests |
|------|-------|
| Home | 5 |
| Transcription (including errors) | 8 |
| Results (copy, download, translation) | 9 |
| Recording | 1 |
| Accessibility (axe scans, headings, focus) | 5 |
| Responsive layout | 6 |

### Run Everything

```bash
npm run test:all
```

## CI

GitHub Actions runs linting, unit tests with coverage, the build, and E2E tests (Chromium) against that build on every push and pull request to `main`.

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
│   ├── presets.js          # Message types, loading statuses and the language list
│   ├── whisper.worker.js   # Loads Whisper, runs ASR inference, streams partial results to the main thread
│   └── translate.worker.js # Loads NLLB-200, handles translation with cancel support and WASM error recovery
├── App.jsx                 # State management and view routing
├── main.jsx                # React entry point
└── index.css               # Tailwind base + custom button and scrollbar styles
```

The `tests/` directory mirrors `src/` with a `unit/` subfolder for Vitest tests and an `e2e/` subfolder for Playwright tests.