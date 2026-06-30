import { useState, useRef, useEffect, useCallback } from 'react';
import bgImage from './assets/minecraft-dirt-background.png';
import Home from './components/Home';
import Header from './components/Header';
import File from './components/File';
import Info from './components/Info';
import Transcribe from './components/Transcribe';
import { MessageTypes } from './utils/presets';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [liveStream, setLiveStream] = useState(null);
  const [transcription, setTranscription] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [error, setError] = useState('');
  const hasAudio = selectedFile || liveStream;
  const workerRef = useRef(null);
  const translateWorkerRef = useRef(null);
  const cancelledRef = useRef(false);

  /* Stops processing and clears state but keeps the audio so the user can retry */
  const cancelTranscription = () => {
    cancelledRef.current = true;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setTranscription([]);
    setIsComplete(false);
    setError('');
    setDownloadProgress('');
    setIsDownloading(false);
    setIsLoading(false);
  };

  const resetAudio = () => {
    cancelledRef.current = true;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setSelectedFile(null);
    setLiveStream(null);
    setTranscription([]);
    setIsComplete(false);
    setError('');
    setDownloadProgress('');
    setIsDownloading(false);
    setIsLoading(false);
  };

  /* Translation worker is kept alive across translations so the NLLB pipeline stays in memory */
  useEffect(() => {
    if (!translateWorkerRef.current) {
      translateWorkerRef.current = new Worker(
        new URL('./utils/translate.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
  }, []);

  /* Creates the Whisper worker and wires its typed status messages to UI state */
  const createWhisperWorker = useCallback(() => {
    if (workerRef.current) return;

    workerRef.current = new Worker(
      new URL('./utils/whisper.worker.js', import.meta.url),
      { type: 'module' }
    );

    const handleMessage = e => {
      if (cancelledRef.current) return;
      const { type, results, result, file, loaded, total, status } = e.data;

      switch (type) {
        case MessageTypes.DOWNLOADING: {
          setIsDownloading(true);
          setIsLoading(false);
          const percent = total ? Math.round((loaded / total) * 100) : 0;
          setDownloadProgress(`Downloading ${file}... ${percent}%`);
          break;
        }
        case MessageTypes.LOADING: {
          if (status === 'error') {
            setError('Failed to load model. Please refresh and try again.');
            setIsLoading(false);
            setIsDownloading(false);
            setDownloadProgress('');
          } else {
            setIsLoading(true);
            setIsDownloading(false);
            setDownloadProgress(status === 'success' ? 'Transcribing…' : 'Loading model...');
          }
          break;
        }
        case MessageTypes.RESULT: {
          if (Array.isArray(results)) setTranscription(results);
          break;
        }
        case MessageTypes.RESULT_PARTIAL: {
          /* Each partial result replaces the last entry to show a live preview */
          if (result) {
            setTranscription(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = result;
              } else {
                updated.push(result);
              }
              return updated;
            });
          }
          break;
        }
        case MessageTypes.INFERENCE_DONE: {
          setIsComplete(true);
          setIsLoading(false);
          setDownloadProgress('');
          break;
        }
        default:
          break;
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
  }, []);

  /* Decodes audio to the 16 kHz mono Float32Array that Whisper expects */
  const extractAudioBuffer = async input => {
    const arrayBuffer = await input.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioContext.close();
    return audioBuffer.getChannelData(0);
  };

  const processAudio = useCallback(async () => {
    if (!hasAudio) return;
    cancelledRef.current = false;
    createWhisperWorker();
    setError('');
    setTranscription([]);
    setIsComplete(false);
    setIsDownloading(true);
    setDownloadProgress('Preparing audio...');

    try {
      const audioData = await extractAudioBuffer(selectedFile || liveStream);
      workerRef.current?.postMessage({
        type: MessageTypes.INFERENCE_REQUEST,
        audio: audioData,
      });
    } catch {
      setError('Failed to process audio. Please try a different file.');
      setIsDownloading(false);
      setDownloadProgress('');
    }
  }, [hasAudio, selectedFile, liveStream, createWhisperWorker]);

  return (
    <div
      className="bg-dirt min-h-screen w-full flex flex-col"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Header />

      <div className="flex flex-col flex-grow items-center justify-center">
        <div className="flex flex-col max-w-[62.5rem] mx-auto w-full">
          <section className="flex flex-col flex-grow">
            {isComplete && transcription.length > 0 ? (
              <Info output={transcription} onReset={resetAudio} translateWorkerRef={translateWorkerRef} />
            ) : isLoading || isDownloading ? (
              <div className="flex flex-col items-center justify-center flex-1 p-4 gap-3">
                <Transcribe />

                <div className="flex flex-col items-center gap-2 text-center">
                  {downloadProgress && (
                    <p className="text-[1.75rem] text-teal-300 max-w-md leading-snug">
                      {downloadProgress}
                    </p>
                  )}

                  {error && (
                    <p className="text-lg text-red-400 max-w-md leading-snug" role="alert">
                      {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={cancelTranscription}
                  className="specialBtn mt-4 px-4 py-2 text-2xl font-semibold text-teal-200 flex items-center justify-center gap-3"
                  aria-label="Cancel transcription"
                >
                  <i className="fa-solid fa-xmark" />
                  <p>Cancel</p>
                </button>
              </div>
            ) : hasAudio ? (
              <File
                onFormSubmit={processAudio}
                onAudioReset={resetAudio}
                file={selectedFile}
                audioStream={liveStream}
              />
            ) : (
              <Home setFile={setSelectedFile} setAudioStream={setLiveStream} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}