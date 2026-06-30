function Transcribe() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
      <h1 className="text-5xl font-medium leading-tight text-teal-300">
        Transcription in progress…
      </h1>
      <p className="text-[2rem] text-teal-300 max-w-xl leading-relaxed">
        This may take a moment depending on the length of your audio. On the
        first run the model also needs to load, which may take a little longer.
      </p>
    </div>
  );
}

export default Transcribe;