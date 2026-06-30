import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

/* Integration tests covering view transitions driven by worker messages */
describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
  });
  it('shows Header component', () => {
    render(<App />);
    expect(screen.getByLabelText('Nabu')).toBeInTheDocument();
  });
  it('shows Home component initially', () => {
    render(<App />);
    expect(screen.getByText('Record')).toBeInTheDocument();
  });
  it('shows instruction text', () => {
    render(<App />);
    expect(screen.getByText(/record any speech/i)).toBeInTheDocument();
  });
  it('shows file upload option', () => {
    render(<App />);
    expect(screen.getByText('Audio File')).toBeInTheDocument();
  });
});

describe('App file selection flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches to File view after file upload', async () => {
    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(screen.getByText('Here is your file:')).toBeInTheDocument();
    });
  });
  it('shows Transcribe button after file upload', async () => {
    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(screen.getByText('Transcribe')).toBeInTheDocument();
    });
  });
  it('shows audio player after file upload', async () => {
    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(screen.getByLabelText('Audio preview')).toBeInTheDocument();
    });
  });
  it('Restart returns to Home view', async () => {
    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });
    const restartBtn = screen.getByText('Restart');
    await userEvent.click(restartBtn);
    await waitFor(() => {
      expect(screen.getByText('Record')).toBeInTheDocument();
    });
  });
});

describe('App recording flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Stop button when recording', async () => {
    render(<App />);
    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });
  });
  it('shows timer when recording', async () => {
    render(<App />);
    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });
});

describe('App transcription flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clicking Transcribe shows loading state', async () => {
    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(screen.getByText('Transcribe')).toBeInTheDocument();
    });
    const transcribeBtn = screen.getByText('Transcribe');
    await userEvent.click(transcribeBtn);
    await waitFor(() => {
      const hasLoadingText = screen.queryByText(/preparing audio/i) ||
                             screen.queryByText(/transcribing/i);
      expect(hasLoadingText).toBeInTheDocument();
    }, { timeout: 3000 });
  });
  it('Cancel button appears during transcription', async () => {
    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(screen.getByText('Transcribe')).toBeInTheDocument();
    });
    const transcribeBtn = screen.getByText('Transcribe');
    await userEvent.click(transcribeBtn);
    await waitFor(() => {
      expect(screen.getByLabelText('Cancel transcription')).toBeInTheDocument();
    });
  });
});

describe('App state management', () => {
  it('initial state has no audio', () => {
    render(<App />);
    expect(screen.queryByText('Here is your file:')).not.toBeInTheDocument();
  });
  it('initial state has no transcription', () => {
    render(<App />);
    expect(screen.queryByText('Here is your result:')).not.toBeInTheDocument();
  });
});

describe('App partial result accumulation', () => {
  it('RESULT_PARTIAL messages accumulate into transcription state', async () => {
    const originalWorker = global.Worker;
    global.Worker = class {
      constructor() { this.listeners = new Map(); }
      postMessage() {
        setTimeout(() => {
          const handlers = this.listeners.get('message');
          if (!handlers) return;

          handlers.forEach(h => h({ data: { type: 'RESULT_PARTIAL', result: { text: 'Hello' } } }));

          handlers.forEach(h => h({ data: { type: 'RESULT_PARTIAL', result: { text: 'Hello world' } } }));

          handlers.forEach(h => h({ data: { type: 'RESULT', results: [{ text: 'Hello world' }] } }));

          handlers.forEach(h => h({ data: { type: 'INFERENCE_DONE' } }));
        }, 10);
      }
      addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(handler);
      }
      removeEventListener(type, handler) {
        const handlers = this.listeners.get(type);
        if (handlers) {
          const i = handlers.indexOf(handler);
          if (i > -1) handlers.splice(i, 1);
        }
      }
      terminate() {}
    };

    render(<App />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    await waitFor(() => expect(screen.getByText('Transcribe')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Transcribe'));

    await waitFor(() => {
      expect(screen.queryByText(/hello world/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    global.Worker = originalWorker;
  });
});