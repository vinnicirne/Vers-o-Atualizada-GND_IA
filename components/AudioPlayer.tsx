
import React, { useState, useEffect, useRef } from 'react';
import { decode, decodeAudioData, audioBufferToWav } from '../services/ttsService';

interface AudioPlayerProps {
  audioBase64: string;
}

export function AudioPlayer({ audioBase64 }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

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
        
        const decodedBytes = decode(audioBase64);
        const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
        audioBufferRef.current = buffer;
        setDuration(buffer.duration);
      } catch (err) {
        console.error("Failed to decode audio:", err);
        setError("Falha ao processar o áudio.");
      } finally {
        setIsLoading(false);
      }
    };

    processAudio();

    return () => {
      stopAudio();
    };
  }, [audioBase64]);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    if (isPlaying) {
      stopAudio();
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
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
    a.download = `audio-gdn-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="mt-4 bg-red-900/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-center text-sm">
        <i className="fas fa-exclamation-circle mr-2"></i>{error}
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white p-5 rounded-2xl shadow-lg border border-gray-100 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
      {isLoading ? (
        <div className="flex items-center space-x-3 text-gray-400 py-2">
          <i className="fas fa-spinner fa-spin text-xl"></i>
          <span className="text-sm font-medium">Processando áudio neural...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-1 w-full">
            <button
              onClick={togglePlayPause}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md ${
                isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-[var(--brand-tertiary)] hover:bg-green-600 text-white'
              }`}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl ${!isPlaying ? 'ml-1' : ''}`}></i>
            </button>
            
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--brand-secondary)] mb-1">Narração Digital</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                <span>0:00</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-[var(--brand-tertiary)] transition-all duration-300 ${isPlaying ? 'animate-progress' : ''}`}
                    style={{ width: isPlaying ? '100%' : '0%', animationDuration: `${duration}s` }}
                  ></div>
                </div>
                <span>{duration.toFixed(1)}s</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors w-full sm:w-auto justify-center"
          >
            <i className="fas fa-download"></i>
            <span>Baixar .WAV</span>
          </button>
        </>
      )}
    </div>
  );
}
