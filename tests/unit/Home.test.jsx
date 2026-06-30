import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../src/components/Home';

/* Covers the recording and upload UI states plus denied-mic error handling */
describe('Home', () => {
  const mockSetAudioStream = vi.fn();
  const mockSetFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
  });
  it('displays instruction text', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    expect(screen.getByText(/record any speech/i)).toBeInTheDocument();
  });
  it('shows Record button initially', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    expect(screen.getByText('Record')).toBeInTheDocument();
  });
  it('shows Audio File upload button', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    expect(screen.getByText('Audio File')).toBeInTheDocument();
  });
  it('shows max recording info', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    expect(screen.getByText(/max recording: 10 minutes/i)).toBeInTheDocument();
  });
  it('has file input element', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const fileInput = document.getElementById('file-upload');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
  });
  it('file input accepts audio formats', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const fileInput = document.getElementById('file-upload');
    expect(fileInput).toHaveAttribute('accept', '.mp3,.wav,.webm,.ogg,.m4a');
  });
  it('file input is hidden', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const fileInput = document.getElementById('file-upload');
    expect(fileInput).toHaveClass('hidden');
  });
  it('clicking record starts recording', async () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });
  });
  it('shows timer when recording', async () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });
  it('shows red pulse indicator when recording', async () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      const pulse = document.querySelector('.animate-pulse');
      expect(pulse).toBeInTheDocument();
    });
  });
  it('handles file upload', async () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const fileInput = document.getElementById('file-upload');
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    expect(mockSetFile).toHaveBeenCalledWith(file);
  });
  it('shows error on microphone denied', async () => {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = vi.fn(() => Promise.reject(new Error('Denied')));
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    navigator.mediaDevices.getUserMedia = originalGetUserMedia;
  });
  it('mentions offline capability', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    expect(screen.getByText(/works offline/i)).toBeInTheDocument();
  });
  it('mentions transcribe and translate features', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    expect(screen.getByText(/transcribe/i)).toBeInTheDocument();
    expect(screen.getByText(/translate/i)).toBeInTheDocument();
  });
  it('has microphone icon in record button', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const icon = document.querySelector('.fa-microphone');
    expect(icon).toBeInTheDocument();
  });
  it('has upload icon in upload button', () => {
    render(<Home setAudioStream={mockSetAudioStream} setFile={mockSetFile} />);
    const icon = document.querySelector('.fa-upload');
    expect(icon).toBeInTheDocument();
  });
});

describe('Home recording completion', () => {
  it('calls setAudioStream with a blob after stopping recording', async () => {
    const mockSetAudioStream = vi.fn();
    render(<Home setAudioStream={mockSetAudioStream} setFile={vi.fn()} />);

    const recordBtn = screen.getByText('Record');
    await userEvent.click(recordBtn);
    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    const stopBtn = screen.getByText('Stop');
    await userEvent.click(stopBtn);

    await waitFor(() => {
      expect(mockSetAudioStream).toHaveBeenCalledTimes(1);
      expect(mockSetAudioStream).toHaveBeenCalledWith(expect.any(Blob));
    });
  });
});