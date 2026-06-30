import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

function File({ onAudioReset, file, audioStream, onFormSubmit }) {
  const audioRef = useRef(null);

  /* Create a blob URL for the audio source and revoke it on unmount */
  useEffect(() => {
    if (!file && !audioStream) return;
    const url = URL.createObjectURL(file || audioStream);
    if (audioRef.current) audioRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, audioStream]);

  return (
    <main className="flex-1 px-8 py-6 flex flex-col gap-6 text-center justify-center pb-14 w-full">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl font-medium text-teal-300">
          Here is your file:
        </h1>
      </div>

      <div className="flex flex-col items-center gap-4">
        <audio
          ref={audioRef}
          className="w-full mx-auto"
          style={{ maxWidth: '32em', height: '4em' }}
          controls
          aria-label="Audio preview"
        >
          Your browser does not support the audio element.
        </audio>
      </div>

      <div className="flex flex-row flex-nowrap whitespace-nowrap gap-3 justify-center items-center">
        <button
          onClick={onFormSubmit}
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center justify-center gap-3"
          aria-label="Start transcription"
        >
          <i className="fa-solid fa-microphone-lines" />
          <span>Transcribe</span>
        </button>

        <button
          onClick={onAudioReset}
          className="specialBtn px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center justify-center gap-3"
          aria-label="Reset and try again"
        >
          <i className="fa-solid fa-arrow-rotate-left" />
          <span>Restart</span>
        </button>
      </div>
    </main>
  );
}

File.propTypes = {
  onAudioReset: PropTypes.func.isRequired,
  file: PropTypes.instanceOf(Blob),
  audioStream: PropTypes.instanceOf(Blob),
  onFormSubmit: PropTypes.func.isRequired,
};

export default File;