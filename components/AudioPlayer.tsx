
import React, { useState, useEffect, useRef } from 'react';

// Decodifica Base64 de forma robusta removendo quebras de linha ou espaços
function decodeBase64(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/[\s\n\r]/g, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodifica PCM raw (Int16) para AudioBuffer (Float32) - Padrão Gemini 24kHz
async function decodeRawPcm(data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    // Normalização de 16-bit assinado para float 32-bit (-1.0 a 1.0)
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
    const loadAudio = async () => {
      try {
        setLoading(true);
        if (!audioCtxRef.current) {
          // Gemini TTS retorna áudio em 24000Hz por padrão
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const bytes = decodeBase64(audioBase64);
        const buffer = await decodeRawPcm(bytes, audioCtxRef.current, 24000);
        bufferRef.current = buffer;
        setLoading(false);
      } catch (e) {
        console.error("[AudioPlayer] Erro crítico ao carregar áudio:", e);
        setLoading(false);
      }
    };

    if (audioBase64) {
      loadAudio();
    }

    return () => stopPlayback();
  }, [audioBase64]);

  const stopPlayback = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!bufferRef.current || !audioCtxRef.current) return;

    if (isPlaying) {
      stopPlayback();
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
    <div className="mt-8 bg-white p-6 rounded-2xl shadow-xl border border-orange-100 flex flex-col items-center gap-4 animate-fade-in-up">
      <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shadow-inner">
        <i className="fas fa-microphone-lines text-2xl"></i>
      </div>
      
      <div className="text-center">
        <h4 className="font-bold text-gray-800">Narração Inteligente</h4>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">Sintetizado via Gemini 2.5</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <i className="fas fa-circle-notch fa-spin text-orange-500 text-xl"></i>
          <span className="text-[10px] text-gray-400 font-bold uppercase">Processando Ondas...</span>
        </div>
      ) : (
        <button
          onClick={togglePlay}
          className={`group flex items-center gap-3 px-12 py-4 rounded-full font-bold text-lg transition-all transform active:scale-95 shadow-lg ${
            isPlaying 
            ? 'bg-gray-800 text-white shadow-gray-200' 
            : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200 hover:shadow-orange-300'
          }`}
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} transition-transform group-hover:scale-110`}></i>
          <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir Agora'}</span>
        </button>
      )}

      {isPlaying && (
        <div className="flex gap-1 items-center h-4 mt-1">
          {[1,2,3,4,5,6,5,4,3,2,1].map((h, i) => (
            <div 
              key={i} 
              className="w-1 bg-orange-400 rounded-full animate-pulse" 
              style={{ 
                height: `${Math.random() * 100}%`, 
                animationDuration: `${0.5 + Math.random()}s` 
              }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
}
