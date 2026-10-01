import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../../src/components/Home';

const renderHome = (wrap = element => element) => {
  const setFile = vi.fn();
  const setAudioStream = vi.fn();
  render(wrap(<Home setFile={setFile} setAudioStream={setAudioStream} />));
  return { setFile, setAudioStream };
};

describe('Home', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /* Every other screen opens with a heading in this style, so the first one does too */
  it('opens with a heading like the other screens', () => {
    renderHome();

    expect(screen.getByRole('heading', { level: 2, name: 'Choose your audio:' })).toHaveClass('text-5xl', 'font-medium', 'text-teal-300');
  });

  it('offers recording and uploading', () => {
    renderHome();

    expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
    expect(screen.getByLabelText('Audio File')).toHaveAttribute('type', 'file');
  });

  /* display: none takes an input out of the tab order, so it is only hidden visually */
  it('keeps the upload input in the page for keyboard users rather than removing it', () => {
    renderHome();
    const input = screen.getByLabelText('Audio File');

    expect(input).toHaveClass('sr-only');
    expect(input).not.toHaveClass('hidden');
  });

  it('accepts the audio formats it can decode', () => {
    renderHome();

    expect(screen.getByLabelText('Audio File')).toHaveAttribute('accept', '.mp3,.wav,.webm,.ogg,.m4a');
  });

  it('hands a chosen file over exactly once', async () => {
    const { setFile } = renderHome();
    const file = new File(['audio'], 'speech.mp3', { type: 'audio/mpeg' });

    await userEvent.upload(screen.getByLabelText('Audio File'), file);

    expect(setFile).toHaveBeenCalledTimes(1);
    expect(setFile).toHaveBeenCalledWith(file);
  });

  it('does nothing when the file dialog is closed without a choice', () => {
    const { setFile } = renderHome();

    fireEvent.change(screen.getByLabelText('Audio File'), { target: { files: [] } });

    expect(setFile).not.toHaveBeenCalled();
  });

  it('keeps its icons away from screen readers', () => {
    const { container } = render(<Home setFile={vi.fn()} setAudioStream={vi.fn()} />);

    container.querySelectorAll('i').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });

  describe('recording', () => {
    const startRecording = () => act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    });

    it('asks for the microphone alone and shows a running timer', async () => {
      renderHome();

      await startRecording();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('counts the seconds as it records', async () => {
      vi.useFakeTimers();
      renderHome();
      await startRecording();

      act(() => vi.advanceTimersByTime(65_000));

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('hands the recording over when stopped, in the format it was recorded in', async () => {
      const { setAudioStream } = renderHome();
      await startRecording();

      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

      expect(setAudioStream).toHaveBeenCalledTimes(1);
      expect(setAudioStream.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect(setAudioStream.mock.calls[0][0].type).toBe('audio/webm');
    });

    it('lets go of the microphone once it stops', async () => {
      const track = { stop: vi.fn() };
      navigator.mediaDevices.getUserMedia.mockResolvedValueOnce({ getTracks: () => [track] });
      renderHome();
      await startRecording();

      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

      expect(track.stop).toHaveBeenCalled();
    });

    it('warns once the last minute begins', async () => {
      vi.useFakeTimers();
      renderHome();
      await startRecording();

      act(() => vi.advanceTimersByTime(540_000));

      expect(screen.getByText('Auto-stop in 60 seconds')).toBeInTheDocument();
    });

    /* StrictMode runs state updaters twice, which is how a side effect hidden in one shows itself */
    it('stops on its own at ten minutes, exactly once', async () => {
      vi.useFakeTimers();
      const stop = vi.spyOn(MediaRecorder.prototype, 'stop');
      const { setAudioStream } = renderHome(element => <React.StrictMode>{element}</React.StrictMode>);
      await startRecording();

      act(() => vi.advanceTimersByTime(600_000));

      expect(stop).toHaveBeenCalledTimes(1);
      expect(setAudioStream).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
    });

    it('explains when the microphone is refused', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
      renderHome();

      await startRecording();

      expect(screen.getByRole('alert')).toHaveTextContent('Microphone access denied or unavailable.');
      expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
    });
  });
});