
import React, { useState, useEffect, useRef } from 'react';

<<<<<<< HEAD
// Base64 to Uint8Array decoding function with sanitization
function decode(base64: string): Uint8Array {
  // Remove spaces, newlines, and other whitespace chars that might corrupt base64 decoding
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
=======
// Base64 to Uint8Array decoding function
function decodeBase64ToUint8(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

<<<<<<< HEAD
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

export function AudioPlayer({ audioBase64 }: AudioPlayerProps) {
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
=======
export function AudioPlayer({ audioBase64 }: { audioBase64: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const bytes = decodeBase64ToUint8(audioBase64);

        // Tenta decodificar via decodeAudioData (aceita WAV/MP3/OGG), que é o mais robusto.
        try {
          const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer as ArrayBuffer);
          bufferRef.current = decoded;
        } catch (err) {
          // Se falhar, tenta interpretar como PCM16 raw (fallback padrão Gemini)
          console.warn("decodeAudioData falhou, tentando fallback PCM16:", err);
          const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
          const frameCount = dataInt16.length;
          const sampleRate = 24000;
          const buffer = audioCtxRef.current.createBuffer(1, frameCount, sampleRate);
          const channelData = buffer.getChannelData(0);
          for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
          }
          bufferRef.current = buffer;
        }

        setLoading(false);
      } catch (e) {
        console.error("Audio Load Error:", e);
        setLoading(false);
      }
    };
    init();
    return () => stopAudio();
  }, [audioBase64]);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch { }
      try {
        sourceRef.current.disconnect();
      } catch { }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!bufferRef.current || !audioCtxRef.current) return;

    if (isPlaying) {
      stopAudio();
    } else {
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = bufferRef.current;
      source.connect(audioCtxRef.current.destination);
      source.onended = () => setIsPlaying(false);
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

<<<<<<< HEAD
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
=======
  return (
    <div className="mt-6 bg-white p-6 rounded-2xl shadow-xl border border-orange-100 flex flex-col items-center justify-center animate-fade-in gap-3">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <i className="fas fa-circle-notch fa-spin"></i> Preparando áudio...
        </div>
      ) : (
        <>
          <div className="text-center">
            <h4 className="font-bold text-gray-800 text-sm">Narração Inteligente</h4>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Sintetizado via Gemini 2.5</p>
          </div>
          <button
            onClick={togglePlay}
            className="flex items-center gap-4 px-10 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full font-bold shadow-xl shadow-orange-200 transition-all active:scale-95 transform hover:-translate-y-0.5"
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
            <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir Agora'}</span>
          </button>
        </>
      )}
    </div>
  );
}
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
