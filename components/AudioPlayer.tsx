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
          const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer);
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
      } catch {}
      try {
        sourceRef.current.disconnect();
      } catch {}
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
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

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