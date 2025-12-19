
import React, { useState, useEffect, useRef } from 'react';

// Converte Base64 em bytes (Uint8Array) sem bibliotecas externas
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodifica PCM raw (Int16) para AudioBuffer (Float32)
async function decodeRawPcm(data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    // Normaliza de Int16 (-32768 a 32767) para Float32 (-1.0 a 1.0)
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
    const initAudio = async () => {
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
        console.error("[AudioPlayer] Erro de carregamento:", e);
        setLoading(false);
      }
    };

    if (audioBase64) {
      initAudio();
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
      // Retoma o contexto se estiver suspenso (política do navegador)
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
      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
        <i className="fas fa-microphone-lines text-xl"></i>
      </div>
      
      <div className="text-center">
        <h4 className="font-bold text-gray-800">Narração Gerada</h4>
        <p className="text-xs text-gray-500">Ouça o conteúdo narrado por IA</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-orange-500 font-bold py-3">
          <i className="fas fa-circle-notch fa-spin"></i>
          <span className="text-sm">Sintonizando voz...</span>
        </div>
      ) : (
        <button
          onClick={togglePlay}
          className={`flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg transition-all transform active:scale-95 shadow-lg ${
            isPlaying 
            ? 'bg-gray-800 text-white shadow-gray-200' 
            : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200 hover:shadow-orange-300'
          }`}
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir Agora'}</span>
        </button>
      )}

      {isPlaying && (
        <div className="flex gap-1 items-center h-4">
          {[1,2,3,4,5,4,3,2,1].map((h, i) => (
            <div 
              key={i} 
              className="w-1 bg-orange-400 rounded-full animate-pulse" 
              style={{ height: `${h * 20}%`, animationDelay: `${i * 0.1}s` }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
}
