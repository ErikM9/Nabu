# Nabu

![CI](https://github.com/ErikM9/Nabu/actions/workflows/ci.yml/badge.svg)

A speech transcription and translation app which runs entirely in the browser. You can record yourself or upload an audio file, transcribe it with Whisper and translate the result into more than 200 languages. Your audio never leaves the browser, since both models run locally through WebAssembly.

**Live demo:** [erikm9.github.io/Nabu](https://erikm9.github.io/Nabu/). The models download on first use and stay in the browser cache afterwards, so the first transcription and the first translation take a while.

## Features

- Record straight from your microphone (up to 10 minutes)
- Upload an audio file (MP3, WAV, WebM, OGG or M4A)
- Transcribe English speech to text with Whisper (tiny.en)
- Translate the text into 200+ languages with NLLB-200
- Copy or download the result
- The transcript and the translation are set as large as the screen holds, so a short result is easy to read and only a very long one scrolls
- The models are downloaded once and then cached in the browser

## Quick start

```bash
npm install
npm run dev
```

## Tech stack

- React 18 and Vite 4
- Tailwind CSS
- @xenova/transformers, which runs Whisper and NLLB in the browser through ONNX Runtime
- Vitest and React Testing Library
- Playwright

## How it works

Transcription and translation run in Web Workers, so the UI stays responsive while the models are working.

The Whisper worker is created when a transcription starts and terminated as soon as the user cancels or restarts, so no stale results can reach the UI afterwards. The translation worker is kept alive instead, which means the NLLB model is loaded once and reused for every later translation. It also accepts a `cancel` message which stops a translation part-way, and it throws its pipeline away after a `RangeError` or `TypeError`, the errors a damaged WASM heap raises, so the next attempt loads the model again.

## Testing

You need Node 22 or newer to run the tests.

### Why these tools?

In my smaller projects I picked the testing tools so I could learn how various testing tools work. For Nabu I went with Vitest, React Testing Library, user-event, Playwright and axe-core, because they fit the project best and were the practical choice.

- Vitest runs on Vite's own config, so the tests compile JSX with the same React plugin as the app and need no build setup of their own. Its fake timers run the ten-minute recording limit in an instant, and `@vitest/coverage-v8` fails the run when coverage drops below the thresholds.
- React Testing Library and user-event find elements by their role, label and text and use them the way a person would, so the tests check what the user sees and does instead of the components' internals. user-event also comes with a clipboard of its own, which the copy tests read back from.
- Playwright's `page.route` can answer any request the page makes, which is what lets the e2e tests swap the workers for fakes and keep the suite off the network. It can also grant clipboard permissions, catch downloads and start Chromium with a fake microphone, so recording, copying and downloading are tested end to end, with the exact text checked.
- axe-core runs the WCAG 2.1 A and AA scans through `@axe-core/playwright`.

### Unit tests

Vitest and React Testing Library run the components in jsdom. The workers are replaced by a `FakeWorker` (`tests/support/fake-worker.js`), which records what the page sends and lets each test answer message by message. This way I can drive the transcription and translation flows step by step, with no hidden auto-replies. The two worker scripts are tested on their own in a Node environment, with `@xenova/transformers` mocked. jsdom lays nothing out, so the tests for the result's size give the page the heights a browser would measure.

```bash
npm test                 # run once
npm run test:watch       # watch mode
npm run test:coverage    # with coverage and thresholds
```

**123 tests across 10 files:**

| Area | Tests |
|------|-------|
| App (switching screens, errors, cancel, retry) | 19 |
| Home (upload, recording, auto-stop) | 14 |
| File | 8 |
| Info (copy, download, language picker, translation, the result's size) | 36 |
| Header and Transcribe | 4 |
| Fitting the result to the screen | 8 |
| Presets | 13 |
| Whisper worker | 12 |
| Translation worker | 9 |

`@testing-library/dom` is listed as a dev dependency of its own so that React Testing Library and user-event share one copy of it. With two copies, the updates from user-event run outside React's `act()` and every test prints warnings.

### E2E tests

Playwright runs against a production build (`npm run build && npm run preview`). The Whisper and NLLB workers are replaced with scripted fakes at the network level (`tests/e2e/support/fake-workers.js`), so every flow runs from start to finish without downloading a model: transcription, translation, copying, downloading, cancelling and what the page does when transcription or translation goes wrong. Chromium's fake capture device stands in for the microphone. Requests for Font Awesome and Google Fonts are blocked, and any other request which would leave the preview server fails the test.

```bash
npm run test:e2e         # headless
npm run test:e2e:headed  # with the browser window
```

**44 tests across 6 files:**

| Area | Tests |
|------|-------|
| Home | 5 |
| Transcription (including errors) | 8 |
| Results (copy, download, translation, language list) | 14 |
| Recording | 1 |
| Accessibility (axe scans, headings, focus) | 5 |
| Responsive layout (no sideways scrolling, even spacing, the result's size) | 11 |

### Run everything

```bash
npm run test:all
```

## CI

GitHub Actions runs the linter, the unit tests with coverage, the build and the E2E tests (in Chromium, against that build) on every push and pull request to `main`. A push to `main` which passes them all is then built for the `/Nabu/` path and deployed to GitHub Pages.

## Deployment

The demo is the production build on GitHub Pages: the `deploy` job in `ci.yml` builds with `BASE_PATH=/Nabu/`, since the site lives under that path, and publishes `dist/`; Pages has to be set to deploy from GitHub Actions once, in the repository settings. Any static host works the same way: `npm run build`, with `BASE_PATH` set when the site sits under a path, and serve `dist/`. There is no server side; the models come from Hugging Face when a visitor first uses them.

## Project structure

```
src/
  assets/                 images
  components/
    Header.jsx            app title and mascot
    Home.jsx              record / upload landing screen
    File.jsx              audio preview before transcription
    Transcribe.jsx        loading screen during transcription
    Info.jsx              results: transcription, translation, copy and download
  utils/
    fitText.js            sets the result as large as the screen holds without scrolling
    presets.js            message types, loading statuses and the language list
    whisper.worker.js     loads Whisper and transcribes the audio in chunks
    translate.worker.js   loads NLLB-200 and translates, with cancel support and a reload after a WASM fault
  App.jsx                 state management and switching between the screens
  main.jsx                React entry point
  index.css               Tailwind base, fluid sizing and the stone button styles
tests/
  unit/                   Vitest tests, one file per component, worker or module
  e2e/                    Playwright specs, with the page model, fixtures and fake workers in support/
  support/, setup.js      the fake Worker and the browser API mocks for the unit tests
  fixtures/               audio files for the E2E tests
```