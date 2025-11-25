import React, { useState, useEffect, useRef } from 'react';

// Base64 to Uint8Array decoding function
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Raw PCM data to AudioBuffer decoding function
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length; // Assuming single channel
  const buffer = ctx.createBuffer(1, frameCount, 24000); // Gemini TTS sample rate is 24kHz

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}


interface AudioPlayerProps {
  audioBase64: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBase64 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!audioBase64) return;

    // Initialize AudioContext on first interaction or effect run
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;

    const processAudio = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const decodedBytes = decode(audioBase64);
        const buffer = await decodeAudioData(decodedBytes, audioContext);
        audioBufferRef.current = buffer;
      } catch (err) {
        console.error("Failed to decode audio:", err);
        setError("Falha ao processar o áudio.");
      } finally {
        setIsLoading(false);
      }
    };

    processAudio();

    // Cleanup function
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [audioBase64]);

  const togglePlayPause = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  if (error) {
    return (
        <div className="mt-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center" role="alert">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline">{error}</span>
        </div>
    );
  }

  return (
    <div className="mt-6 bg-black/50 p-4 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.2)] border border-green-900/30 flex items-center justify-center animate-fade-in">
      {isLoading ? (
        <div className="flex items-center space-x-3 text-gray-400">
          <i className="fas fa-spinner fa-spin text-xl"></i>
          <span>Processando áudio...</span>
        </div>
      ) : (
        <button
          onClick={togglePlayPause}
          className="flex items-center space-x-3 px-6 py-3 bg-green-900/30 hover:bg-green-900/60 border border-green-700/50 rounded-lg text-green-300 font-bold transition-colors"
          aria-label={isPlaying ? 'Pausar áudio' : 'Tocar áudio'}
        >
          <i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'} text-3xl`}></i>
          <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir a Matéria'}</span>
        </button>
      )}
    </div>
  );
};