import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { FakeWorker } from '../support/fake-worker';

const uploadAudio = async user => {
  await user.upload(screen.getByLabelText('Audio File'), new File(['audio'], 'speech.wav', { type: 'audio/wav' }));
  await screen.findByRole('heading', { name: 'Here is your file:' });
};

/* Uploads a file, presses Transcribe and hands back the Whisper worker once the audio has been sent to it */
const startTranscription = async user => {
  await uploadAudio(user);
  await user.click(screen.getByRole('button', { name: 'Transcribe' }));
  await waitFor(() => expect(FakeWorker.latest('whisper')?.posted).toHaveLength(1));
  return FakeWorker.latest('whisper');
};

const send = (worker, ...messages) => act(() => messages.forEach(message => worker.emit(message)));

describe('App', () => {
  it('starts on the home screen', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Here is your file:' })).not.toBeInTheDocument();
  });

  it('shows a chosen file ready to transcribe', async () => {
    render(<App />);

    await uploadAudio(userEvent.setup());

    expect(screen.getByLabelText('Audio preview')).toBeInTheDocument();
  });

  it('goes back home on Restart', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadAudio(user);

    await user.click(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
  });

  it('turns a finished recording into audio ready to transcribe', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    expect(await screen.findByRole('heading', { name: 'Here is your file:' })).toBeInTheDocument();
  });

  describe('transcribing', () => {
    it('decodes the audio to 16 kHz samples and sends them to the Whisper worker', async () => {
      render(<App />);

      const worker = await startTranscription(userEvent.setup());

      expect(worker.posted[0]).toMatchObject({ type: 'INFERENCE_REQUEST' });
      expect(worker.posted[0].audio).toBeInstanceOf(Float32Array);
      expect(worker.posted[0].audio).toHaveLength(16000);
    });

    it('reports how far the model download has got', async () => {
      render(<App />);
      const worker = await startTranscription(userEvent.setup());

      send(worker, { type: 'DOWNLOADING', file: 'encoder_model.onnx', loaded: 50, total: 200 });

      expect(screen.getByRole('status')).toHaveTextContent('Downloading encoder_model.onnx... 25%');
    });

    it('says it is transcribing once the model has loaded', async () => {
      render(<App />);
      const worker = await startTranscription(userEvent.setup());

      send(worker, { type: 'LOADING', status: 'success' });

      expect(screen.getByRole('status')).toHaveTextContent('Transcribing…');
      expect(screen.getByRole('heading', { name: 'Transcription in progress…' })).toBeInTheDocument();
    });

    it('shows the transcription when Whisper finishes', async () => {
      render(<App />);
      const worker = await startTranscription(userEvent.setup());

      send(worker,
        { type: 'LOADING', status: 'success' },
        { type: 'RESULT', results: [{ text: 'Hello' }, { text: 'world' }] },
        { type: 'INFERENCE_DONE' });

      expect(screen.getByRole('heading', { name: 'Here is your result:' })).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('replaces each partial result with the next rather than adding them up', async () => {
      render(<App />);
      const worker = await startTranscription(userEvent.setup());

      send(worker,
        { type: 'RESULT_PARTIAL', result: { text: 'Hel' } },
        { type: 'RESULT_PARTIAL', result: { text: 'Hello there' } },
        { type: 'INFERENCE_DONE' });

      expect(screen.getByText('Hello there')).toBeInTheDocument();
      expect(screen.queryByText(/Hel Hello/)).not.toBeInTheDocument();
    });

    it('cancels back to the file, stops the worker and ignores anything it sends afterwards', async () => {
      const user = userEvent.setup();
      render(<App />);
      const worker = await startTranscription(user);

      await user.click(screen.getByRole('button', { name: 'Cancel transcription' }));
      send(worker, { type: 'RESULT', results: [{ text: 'Too late' }] }, { type: 'INFERENCE_DONE' });

      expect(worker.terminated).toBe(true);
      expect(screen.getByRole('heading', { name: 'Here is your file:' })).toBeInTheDocument();
      expect(screen.queryByText('Too late')).not.toBeInTheDocument();
    });

    it('starts a fresh worker for the next attempt after a cancel', async () => {
      const user = userEvent.setup();
      render(<App />);
      const first = await startTranscription(user);
      await user.click(screen.getByRole('button', { name: 'Cancel transcription' }));

      await user.click(screen.getByRole('button', { name: 'Transcribe' }));

      await waitFor(() => expect(FakeWorker.latest('whisper')).not.toBe(first));
    });
  });

  describe('when something goes wrong', () => {
    it('explains that the model failed to load', async () => {
      render(<App />);
      const worker = await startTranscription(userEvent.setup());

      send(worker, { type: 'LOADING', status: 'error', message: 'network' });

      expect(screen.getByRole('heading', { name: 'Here is your file:' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load model. Please refresh and try again.');
    });

    it('explains that the audio could not be read', async () => {
      vi.spyOn(AudioContext.prototype, 'decodeAudioData').mockRejectedValueOnce(new Error('EncodingError'));
      const user = userEvent.setup();
      render(<App />);
      await uploadAudio(user);

      await user.click(screen.getByRole('button', { name: 'Transcribe' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to process audio. Please try a different file.');
    });

    it('says so when no speech was heard', async () => {
      render(<App />);
      const worker = await startTranscription(userEvent.setup());

      send(worker, { type: 'LOADING', status: 'success' }, { type: 'INFERENCE_DONE' });

      expect(screen.getByRole('alert')).toHaveTextContent('No speech was detected in this audio.');
    });

    it('recovers from a worker that cannot start', async () => {
      const user = userEvent.setup();
      render(<App />);
      const broken = await startTranscription(user);

      act(() => broken.fail());

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to start transcription.');
      expect(broken.terminated).toBe(true);

      await user.click(screen.getByRole('button', { name: 'Transcribe' }));
      await waitFor(() => expect(FakeWorker.latest('whisper')).not.toBe(broken));
    });

    it('clears the old error when the user tries again', async () => {
      const user = userEvent.setup();
      render(<App />);
      const worker = await startTranscription(user);
      send(worker, { type: 'LOADING', status: 'error' });

      await user.click(screen.getByRole('button', { name: 'Transcribe' }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});