
import React, { useState, useEffect, useRef } from 'react';

interface ImageStudioProps {
  prompt: string;
  originalPrompt: string; // O prompt em inglês gerado pela IA
  width: number;
  height: number;
}

export function ImageStudio({ prompt, originalPrompt, width, height }: ImageStudioProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [sepia, setSepia] = useState(0);
  const [blur, setBlur] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Gerar URL da Pollinations
    const encodedPrompt = encodeURIComponent(originalPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    setImageUrl(url);
    setLoading(true);
  }, [originalPrompt, width, height]);

  const handleImageLoad = () => {
    setLoading(false);
  };

  const getFilterString = () => {
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) blur(${blur}px)`;
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setSepia(0);
    setBlur(0);
  };

  const handleDownload = () => {
    // Para baixar com filtros, precisamos desenhar num canvas
    // Nota: Pollinations pode ter CORS, então usamos fetch blob se possível, ou abrimos nova aba
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        if(ctx) {
            ctx.filter = getFilterString();
            ctx.drawImage(img, 0, 0, width, height);
            
            const link = document.createElement('a');
            link.download = `art-gdn-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };
  };

  return (
    <div className="bg-gray-900 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in-up flex flex-col md:flex-row h-auto md:h-[80vh]">
      
      {/* Sidebar de Ferramentas */}
      <div className="w-full md:w-72 bg-gray-950 border-r border-green-900/30 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
            <h3 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-4">
                <i className="fas fa-sliders-h mr-2"></i>Ajustes
            </h3>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Brilho</span>
                        <span>{brightness}%</span>
                    </div>
                    <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                </div>
                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Contraste</span>
                        <span>{contrast}%</span>
                    </div>
                    <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                </div>
                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Saturação</span>
                        <span>{saturate}%</span>
                    </div>
                    <input type="range" min="0" max="200" value={saturate} onChange={e => setSaturate(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                </div>
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Sépia</span>
                        <span>{sepia}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={sepia} onChange={e => setSepia(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                </div>
                 <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Blur</span>
                        <span>{blur}px</span>
                    </div>
                    <input type="range" min="0" max="10" value={blur} onChange={e => setBlur(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                </div>
            </div>
        </div>

        <button onClick={handleReset} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-bold transition">
            Resetar Filtros
        </button>

        <div className="mt-auto pt-6 border-t border-gray-800">
             <h3 className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
                Prompt Otimizado (IA)
            </h3>
            <div className="bg-black/50 p-3 rounded text-xs text-gray-400 italic max-h-32 overflow-y-auto border border-gray-800">
                "{originalPrompt}"
            </div>
        </div>
      </div>

      {/* Área Principal (Canvas) */}
      <div className="flex-grow bg-black/80 flex flex-col relative">
         {/* Toolbar Superior */}
         <div className="h-14 bg-gray-950 border-b border-green-900/20 flex items-center justify-between px-6">
            <div className="text-gray-400 text-xs font-mono">
                {width}x{height}px
            </div>
            <button 
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-500 text-black px-4 py-1.5 rounded text-sm font-bold flex items-center shadow-lg shadow-green-600/20 transition"
            >
                <i className="fas fa-download mr-2"></i> Baixar Arte
            </button>
         </div>

         {/* Visualização da Imagem */}
         <div className="flex-grow flex items-center justify-center p-8 overflow-hidden relative">
            {loading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
                    <i className="fas fa-palette fa-spin text-4xl text-purple-500 mb-4"></i>
                    <p className="text-purple-400 font-mono animate-pulse">Renderizando pixels...</p>
                 </div>
            )}
            
            <img 
                src={imageUrl} 
                alt="AI Generated Art"
                className="max-w-full max-h-full shadow-2xl border border-gray-800"
                style={{ filter: getFilterString() }}
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
            />
            
            {/* Canvas oculto para processamento do download */}
            <canvas ref={canvasRef} className="hidden"></canvas>
         </div>
      </div>
    </div>
  );
}
