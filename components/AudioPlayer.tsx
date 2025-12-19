
import React, { useState, useEffect, useRef } from 'react';

function decodeBase64ToUint8(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function createAudioBuffer(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

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
        const buffer = await createAudioBuffer(bytes, audioCtxRef.current);
        bufferRef.current = buffer;
        setLoading(false);
      } catch (e) {
        console.error("Audio Load Error:", e);
      }
    };
    init();
    return () => stopAudio();
  }, [audioBase64]);

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!bufferRef.current || !audioCtxRef.current) return;

    if (isPlaying) {
      stopAudio();
    } else {
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = bufferRef.current;
      source.connect(audioCtxRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  return (
    <div className="mt-6 bg-white p-4 rounded-xl shadow-lg border border-orange-100 flex items-center justify-center animate-fade-in">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <i className="fas fa-circle-notch fa-spin"></i> Preparando áudio...
        </div>
      ) : (
        <button
          onClick={togglePlay}
          className="flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full font-bold shadow-xl shadow-orange-200 transition-all active:scale-95"
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
          <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir Agora'}</span>
        </button>
      )}
    </div>
  );
}
