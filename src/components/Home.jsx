import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

const MAX_RECORDING_SECONDS = 600;

/* Pick the best supported audio format for MediaRecorder in the current browser */
const getSupportedMimeType = () =>
  ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'].find(
    type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
  ) || 'audio/webm';

function Home({ setAudioStream, setFile }) {
  const [recordingStatus, setRecordingStatus] = useState('inactive');
  const [recordTime, setRecordTime] = useState(0);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  /* Native change listener */
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;
    const handler = () => {
      const file = input.files?.[0];
      if (file) setFile(file);
    };
    input.addEventListener('change', handler);
    return () => input.removeEventListener('change', handler);
  }, [setFile]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || recordingStatus !== 'recording') return;
    mediaRecorderRef.current.stop();
    setRecordingStatus('inactive');
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, [recordingStatus]);

  /* Tick the recording timer every second and auto-stop at the time limit */
  useEffect(() => {
    if (recordingStatus !== 'recording') return;
    const interval = setInterval(() => {
      setRecordTime(prev => {
        const next = prev + 1;
        if (next >= MAX_RECORDING_SECONDS) {
          stopRecording();
          return MAX_RECORDING_SECONDS;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recordingStatus, stopRecording]);

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startRecording = async () => {
    setError('');
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        setAudioStream(new Blob(chunksRef.current, { type: getSupportedMimeType() }));
        chunksRef.current = [];
      };

      mediaRecorder.start();
      setRecordingStatus('recording');
      setRecordTime(0);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  };

  return (
    <main className="flex-1 px-8 py-6 flex flex-col gap-4 text-center justify-center pb-14">
      <div className="max-w-2xl mx-auto">
        <p className="text-3xl text-teal-300 leading-relaxed">
          Record any speech or upload an audio file. Transcribe it and translate
          to any language. Download the result when done.
        </p>
      </div>

      {error && (
        <p className="text-xl text-red-400 max-w-xl mx-auto -mt-2" role="alert">
          {error}
        </p>
      )}

      {recordingStatus === 'recording' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="font-mono text-3xl text-teal-300">{formatTime(recordTime)}</span>
          </div>
          {recordTime >= MAX_RECORDING_SECONDS - 60 && (
            <p className="text-lg text-yellow-400">
              Auto-stop in {MAX_RECORDING_SECONDS - recordTime} seconds
            </p>
          )}
        </div>
      )}

      <div className="flex flex-row flex-nowrap whitespace-nowrap gap-3 justify-center items-center">
        <button
          onClick={recordingStatus === 'recording' ? stopRecording : startRecording}
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center justify-center gap-3"
        >
          {recordingStatus === 'recording' ? (
            <>
              <i className="fa-solid fa-stop" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-microphone" />
              <span>Record</span>
            </>
          )}
        </button>

        <label
          htmlFor="file-upload"
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center justify-center gap-3 cursor-pointer"
        >
          <i className="fa-solid fa-upload" />
          <span>Audio File</span>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.webm,.ogg,.m4a"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) setFile(file);
            }}
            className="hidden"
          />
        </label>
      </div>

      <p className="text-xl text-teal-300 mt-2 max-w-xl mx-auto">
        Max recording: 10 minutes. Works offline after first load.
      </p>
    </main>
  );
}

Home.propTypes = {
  setAudioStream: PropTypes.func.isRequired,
  setFile: PropTypes.func.isRequired,
};

export default Home;