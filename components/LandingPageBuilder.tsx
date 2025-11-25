
import React, { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
// @ts-ignore
import webpagePlugin from 'grapesjs-preset-webpage';
import { Toast } from './admin/Toast';

interface LandingPageBuilderProps {
  initialHtml: string;
}

export function LandingPageBuilder({ initialHtml }: LandingPageBuilderProps) {
  const editorRef = useRef<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'} | null>(null);
  const [activeDevice, setActiveDevice] = useState<'Desktop' | 'Tablet' | 'Mobile'>('Desktop');

  useEffect(() => {
    if (!editorRef.current) {
      const editor = grapesjs.init({
        container: '#gjs',
        height: '100%',
        width: '100%',
        fromElement: false,
        storageManager: false,
        plugins: [webpagePlugin],
        pluginsOpts: {
          [webpagePlugin]: {
            modalImportTitle: 'Importar Código',
            modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">Cole seu HTML aqui</div>',
            modalImportContent: '',
            importPlaceholder: '',
            inlineCss: true,
            // Disable default panels we are replacing with our UI
            textCleanCanvas: 'Limpar Canvas',
            showDevices: false, 
          }
        },
        assetManager: {
            // Habilita o gerenciador de assets para permitir colar URLs externas facilmente
            embedAsBase64: false,
            assets: [
                // Exemplos iniciais
                'https://via.placeholder.com/350x250/78c5d6/fff', 
                'https://via.placeholder.com/350x250/459ba8/fff',
            ],
            upload: false, // Upload de arquivos locais desativado (requer backend)
            inputPlaceholder: 'Cole a URL da imagem aqui (ex: Google Imagens)',
            addBtnText: 'Adicionar Imagem',
            modalTitle: 'Gerenciador de Imagens',
        },
        canvas: {
            styles: [
                // CSS Libraries (FontAwesome, Google Fonts, etc.)
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
                'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
            ],
            scripts: [
                // CORREÇÃO CRÍTICA: Tailwind é um script JS, não um arquivo CSS.
                // Deve estar em 'scripts' para processar as classes dentro do iframe.
                'https://cdn.tailwindcss.com'
            ]
        },
        deviceManager: {
            devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile', width: '375px', widthMedia: '480px' },
            ]
        },
        panels: { 
            defaults: [
                // We keep standard panels but might hide some via CSS/Config if needed
            ] 
        }
      });

      editorRef.current = editor;

      // Ensure dark theme consistency and clean UI
      editor.on('load', () => {
         const panelManager = editor.Panels;
         // Remove default buttons that might clutter the UI if they exist
         panelManager.removeButton('options', 'canvas-clear');
         panelManager.removeButton('options', 'gjs-open-import-webpage');
         panelManager.removeButton('views', 'open-sm');
         panelManager.removeButton('views', 'open-tm');
         panelManager.removeButton('views', 'open-layers');
         panelManager.removeButton('views', 'open-blocks');
      });
    }

    // Carrega o HTML gerado pela IA no editor
    if (editorRef.current && initialHtml) {
        // Pequena limpeza para garantir que o GrapesJS entenda o body background
        editorRef.current.setComponents(initialHtml);
        
        // Força o wrapper (body) a ter a cor de fundo correta se o Tailwind não aplicar imediatamente
        // Isso ajuda a evitar o "flash" branco ou fundo transparente
        const wrapper = editorRef.current.getWrapper();
        if(wrapper) {
            // Tenta extrair classes do body do HTML string original se necessário, 
            // mas geralmente o setComponents já faz o parse das classes do body para o wrapper.
        }
    }

    return () => {
        // Cleanup if needed
    };
  }, [initialHtml]);

  // --- ACTIONS ---

  const handleDeviceChange = (device: 'Desktop' | 'Tablet' | 'Mobile') => {
      if(!editorRef.current) return;
      setActiveDevice(device);
      const deviceManager = editorRef.current.DeviceManager;
      
      if (device === 'Desktop') deviceManager.select('Desktop');
      if (device === 'Tablet') deviceManager.select('Tablet');
      if (device === 'Mobile') deviceManager.select('Mobile');
  };

  const handleUndo = () => editorRef.current?.runCommand('core:undo');
  const handleRedo = () => editorRef.current?.runCommand('core:redo');
  
  const handleToggleBorders = () => {
      editorRef.current?.runCommand('sw-visibility');
  };

  const handleClear = () => {
      if(window.confirm("Tem certeza que deseja limpar tudo?")) {
        editorRef.current?.runCommand('core:canvas-clear');
      }
  };

  const handlePreview = () => {
    if(!editorRef.current) return;
    const html = editorRef.current.getHtml();
    const css = editorRef.current.getCss();
    
    const fullContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview Landing Page</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
          <style>
            body { background-color: #ffffff; } 
            /* Se o usuário definir bg-black no tailwind, ele sobrescreve isso */
            ${css}
          </style>
      </head>
      <body>${html}</body>
      </html>
    `;

    const blob = new Blob([fullContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleExport = () => {
      if(!editorRef.current) return;
      const html = editorRef.current.getHtml();
      const css = editorRef.current.getCss();
      
      const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page</title>
    <meta name="description" content="Landing page gerada via GDN_IA">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
      ${css}
    </style>
</head>
<body class="font-sans antialiased text-gray-900">
    ${html}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'landing-page-export.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ message: "Código exportado com sucesso!", type: 'success' });
  };

  const handlePublish = () => {
      setToast({ message: "Iniciando publicação...", type: 'info' });
      setTimeout(() => {
          setToast({ message: "Landing Page publicada! (Simulação: URL seria gerada aqui)", type: 'success' });
      }, 1500);
  };

  return (
    <div className="bg-gray-900 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in-up flex flex-col h-[90vh]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* PROFESSIONAL TOOLBAR */}
      <div className="bg-gray-950 border-b border-green-900/30 flex flex-col md:flex-row justify-between items-center px-4 py-2 gap-3 text-white">
        
        {/* Left: Brand & Modes */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <i className="fas fa-layer-group"></i>
                <span className="hidden lg:inline">Editor Visual</span>
            </div>
            
            {/* Device Switcher */}
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                <button 
                    onClick={() => handleDeviceChange('Desktop')}
                    className={`px-3 py-1 rounded text-xs transition-all ${activeDevice === 'Desktop' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    title="Desktop"
                >
                    <i className="fas fa-desktop"></i>
                </button>
                <button 
                    onClick={() => handleDeviceChange('Tablet')}
                    className={`px-3 py-1 rounded text-xs transition-all ${activeDevice === 'Tablet' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    title="Tablet"
                >
                    <i className="fas fa-tablet-alt"></i>
                </button>
                <button 
                    onClick={() => handleDeviceChange('Mobile')}
                    className={`px-3 py-1 rounded text-xs transition-all ${activeDevice === 'Mobile' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    title="Mobile"
                >
                    <i className="fas fa-mobile-alt"></i>
                </button>
            </div>
        </div>

        {/* Center: Edit Actions */}
        <div className="flex items-center gap-2">
            <button onClick={handleToggleBorders} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 text-gray-400 hover:text-white transition" title="Mostrar/Ocultar Bordas">
                <i className="fas fa-border-none text-xs"></i>
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button onClick={handleUndo} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 text-gray-400 hover:text-white transition" title="Desfazer">
                <i className="fas fa-undo text-xs"></i>
            </button>
            <button onClick={handleRedo} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 text-gray-400 hover:text-white transition" title="Refazer">
                <i className="fas fa-redo text-xs"></i>
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button onClick={handleClear} className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition" title="Limpar Tudo">
                <i className="fas fa-trash-alt text-xs"></i>
            </button>
        </div>

        {/* Right: Publish Actions */}
        <div className="flex gap-2 w-full md:w-auto justify-end">
            <button onClick={handlePreview} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded text-xs flex items-center gap-2 border border-gray-700 transition">
                <i className="fas fa-eye"></i> <span className="hidden sm:inline">Preview</span>
            </button>
            <button onClick={handleExport} className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800 text-blue-200 font-medium rounded text-xs flex items-center gap-2 border border-blue-800 transition">
                <i className="fas fa-code"></i> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button onClick={handlePublish} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-black font-bold rounded text-xs flex items-center gap-2 shadow-lg shadow-green-600/20 transition">
                <i className="fas fa-rocket"></i> <span className="hidden sm:inline">Publicar</span>
            </button>
        </div>
      </div>
      
      {/* Editor Canvas */}
      <div className="flex-grow relative bg-gray-900 overflow-hidden">
        <div id="gjs" className="h-full w-full" style={{ border: 'none' }}></div>
      </div>
    </div>
  );
}
