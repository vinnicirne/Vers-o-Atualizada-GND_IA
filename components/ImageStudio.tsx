
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

  // Ferramentas Inteligentes
  const [bgTolerance, setBgTolerance] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);

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
    // Recarrega a imagem original se o usuário quiser desfazer a remoção de fundo (re-triggering effect would be complex, simplified reload logic usually needed or store original blob)
    // Para simplificar, o reset foca nos filtros CSS. Para desfazer BG, o ideal seria ter histórico, mas aqui vamos manter simples.
  };

  // Algoritmo de Remoção de Fundo (Chroma Key Baseado na Borda)
  const handleRemoveBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsProcessing(true);

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
        // Configura canvas
        canvas.width = width;
        canvas.height = height;
        if (!ctx) return;

        // Desenha a imagem atual (com filtros se necessário, mas idealmente raw para processar pixels)
        ctx.drawImage(img, 0, 0, width, height);
        
        // Obtém dados dos pixels
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Amostra a cor do canto superior esquerdo como referência de "Fundo"
        // (Imagens de IA geralmente têm fundos uniformes ou degradês que começam nas bordas)
        const bgPixelIndex = 0;
        const bgR = data[bgPixelIndex];
        const bgG = data[bgPixelIndex + 1];
        const bgB = data[bgPixelIndex + 2];

        // Tolerância (0 a 100 convertido para amplitude de cor)
        // Multiplicador 3 para cobrir RGB (3 * 255)
        const threshold = (bgTolerance / 100) * 441; // 441 é aprox sqrt(255^2 * 3)

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Distância Euclidiana de Cor
            const distance = Math.sqrt(
                Math.pow(r - bgR, 2) +
                Math.pow(g - bgG, 2) +
                Math.pow(b - bgB, 2)
            );

            if (distance < threshold) {
                data[i + 3] = 0; // Define Alpha como 0 (Transparente)
            }
        }

        // Coloca os pixels modificados de volta
        ctx.putImageData(imageData, 0, 0);
        
        // Atualiza a URL da imagem para o novo PNG transparente
        setImageUrl(canvas.toDataURL('image/png'));
        setIsProcessing(false);
    };

    img.onerror = () => {
        alert("Erro ao processar imagem (CORS).");
        setIsProcessing(false);
    };
  };

  const handleDownload = () => {
    // Para baixar com filtros CSS aplicados
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
            // Aplica filtros CSS no contexto do canvas antes de desenhar
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
        
        {/* Seção Filtros */}
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

        {/* Seção Ferramentas Inteligentes (Remover Fundo) */}
        <div className="pt-4 border-t border-gray-800">
            <h3 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-4">
                <i className="fas fa-magic mr-2"></i>Ferramentas
            </h3>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Tolerância do Fundo</span>
                        <span>{bgTolerance}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="80" 
                        value={bgTolerance} 
                        onChange={e => setBgTolerance(Number(e.target.value))} 
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Aumente se sobrar bordas, diminua se apagar o objeto.</p>
                </div>

                <button 
                    onClick={handleRemoveBackground} 
                    disabled={isProcessing}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-bold transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-eraser"></i>}
                    Remover Fundo (Auto)
                </button>
            </div>
        </div>

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
      <div className="flex-grow bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-800 flex flex-col relative">
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
                className="max-w-full max-h-full shadow-2xl border border-gray-800 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTAw9HKhAAAAFElEQVQ4T2NzgID/YGRgYAGyJgAAgVsA9Z2D8p0AAAAASUVORK5CYII=')]" 
                style={{ filter: getFilterString() }}
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
            />
            
            {/* Canvas oculto para processamento do download e background removal */}
            <canvas ref={canvasRef} className="hidden"></canvas>
         </div>
      </div>
    </div>
  );
}
