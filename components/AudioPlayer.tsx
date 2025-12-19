
import React, { useState, useEffect, useRef } from 'react';

/**
 * Decodifica Base64 para Uint8Array
 * Implementação manual para evitar dependências externas e garantir compatibilidade.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodifica Raw PCM 16-bit para AudioBuffer
 * Gemini 2.5 TTS retorna Raw PCM em 24kHz.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Converte AudioBuffer para Blob em formato WAVE (WAV)
 * Útil para permitir que o usuário baixe e utilize o áudio externamente.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buffer_arr = new ArrayBuffer(length);
  const view = new DataView(buffer_arr);
  const channels = [];
  let i, sample, offset = 0, pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([buffer_arr], { type: 'audio/wav' });
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

    const processAudio = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const decodedBytes = decode(audioBase64);
        
        // Gemini TTS utiliza Raw PCM 24kHz Mono
        const buffer = await decodeAudioData(decodedBytes, ctx, 24000, 1);
        audioBufferRef.current = buffer;
      } catch (err) {
        console.error("Erro ao decodificar áudio:", err);
        setError("Não foi possível processar o áudio gerado.");
      } finally {
        setIsLoading(false);
      }
    };

    processAudio();

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
      }
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
      const ctx = audioContextRef.current;
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioBufferRef.current) return;
    const wavBlob = audioBufferToWav(audioBufferRef.current);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narracao-gdn-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center font-bold border border-red-200">{error}</div>;

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col md:flex-row items-center gap-6 animate-fade-in-up">
      <div className="flex-1 text-center md:text-left">
          <h4 className="font-bold text-gray-800 text-sm uppercase tracking-widest mb-1">Player Neural GDN</h4>
          <p className="text-xs text-gray-500">Narração gerada via Gemini 2.5 TTS (24kHz Mono).</p>
      </div>

      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="flex items-center space-x-2 text-[var(--brand-primary)]">
            <i className="fas fa-spinner fa-spin text-xl"></i>
            <span className="text-xs font-bold uppercase tracking-tighter">Processando Áudio...</span>
          </div>
        ) : (
          <>
            <button
              onClick={togglePlayPause}
              className="flex items-center space-x-3 px-8 py-3 bg-[var(--brand-primary)] hover:bg-orange-500 text-white rounded-lg font-bold transition-all shadow-md active:scale-95"
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              <span>{isPlaying ? 'Pausar' : 'Ouvir Narração'}</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors border border-gray-200 group"
              title="Baixar Arquivo .WAV"
            >
              <i className="fas fa-download group-hover:scale-110 transition-transform"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
