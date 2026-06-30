import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import File from '../../src/components/File';

/* Checks the audio preview and whether action buttons render and wire up correctly */
describe('File', () => {
  const mockOnAudioReset = vi.fn();
  const mockOnFormSubmit = vi.fn();
  const mockFile = new Blob(['audio'], { type: 'audio/mp3' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
  });
  it('displays file heading', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    expect(screen.getByText('Here is your file:')).toBeInTheDocument();
  });
  it('shows Transcribe button', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    expect(screen.getByText('Transcribe')).toBeInTheDocument();
  });
  it('shows Restart button', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    expect(screen.getByText('Restart')).toBeInTheDocument();
  });
  it('has audio element', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const audio = screen.getByLabelText('Audio preview');
    expect(audio).toBeInTheDocument();
  });
  it('audio has controls', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const audio = screen.getByLabelText('Audio preview');
    expect(audio).toHaveAttribute('controls');
  });
  it('calls onFormSubmit when Transcribe clicked', async () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const transcribeBtn = screen.getByText('Transcribe');
    await userEvent.click(transcribeBtn);
    expect(mockOnFormSubmit).toHaveBeenCalledTimes(1);
  });
  it('calls onAudioReset when Restart clicked', async () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const restartBtn = screen.getByText('Restart');
    await userEvent.click(restartBtn);
    expect(mockOnAudioReset).toHaveBeenCalledTimes(1);
  });
  it('Transcribe button has aria-label', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const btn = screen.getByLabelText('Start transcription');
    expect(btn).toBeInTheDocument();
  });
  it('Restart button has aria-label', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const btn = screen.getByLabelText('Reset and try again');
    expect(btn).toBeInTheDocument();
  });
  it('has microphone icon', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const icon = document.querySelector('.fa-microphone-lines');
    expect(icon).toBeInTheDocument();
  });
  it('has restart icon', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const icon = document.querySelector('.fa-arrow-rotate-left');
    expect(icon).toBeInTheDocument();
  });
  it('works with audioStream instead of file', () => {
    const audioStream = new Blob(['stream'], { type: 'audio/webm' });
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={null}
        audioStream={audioStream}
      />
    );
    expect(screen.getByText('Here is your file:')).toBeInTheDocument();
  });
  it('heading is h1', () => {
    render(
      <File
        onAudioReset={mockOnAudioReset}
        onFormSubmit={mockOnFormSubmit}
        file={mockFile}
        audioStream={null}
      />
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Here is your file:');
  });
});