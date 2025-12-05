
import React, { useRef, useEffect, useState } from 'react';
import { Toast } from './admin/Toast';
import { TEMPLATES } from './landing-page/templates';
import { addBlocks } from './landing-page/blocks';

interface LandingPageBuilderProps {
  initialHtml: string;
  onClose: () => void;
}

// Function to clean HTML from unwanted navigation menus
const sanitizeHtml = (html: string): string => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Sanitização básica para remover menus antigos gerados pela IA que não sejam blocos
        doc.querySelectorAll('nav').forEach(el => el.remove());
        return doc.body.innerHTML;
    } catch (e) {
        return html;
    }
};

export function LandingPageBuilder({ initialHtml, onClose }: LandingPageBuilderProps) {
  // Refs para containers do GrapesJS
  const editorRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  
  const editorInstanceRef = useRef<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'styles' | 'traits' | 'layers'>('blocks');
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [showTemplateModal, setShowTemplateModal] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inicialização
  useEffect(() => {
    let isMounted = true;

    const initializeEditor = async () => {
      if (!editorRef.current) return;
      if (editorInstanceRef.current) return;

      let processedHtml = initialHtml;
      if (initialHtml && initialHtml.length > 50) {
          processedHtml = sanitizeHtml(initialHtml);
          setShowTemplateModal(false);
      }

      try {
        // @ts-ignore
        const grapesjsModule = await import('grapesjs');
        const GrapesJS: any = grapesjsModule.default || grapesjsModule;

        if (!isMounted) return;

        if(editorRef.current) editorRef.current.innerHTML = '';

        const editorInstance = GrapesJS.init({
          container: editorRef.current,
          height: '100%',
          width: 'auto',
          fromElement: false,
          components: processedHtml || '<body class="bg-gray-50"><div style="padding: 50px; text-align: center;">Arraste blocos aqui...</div></body>',
          // Desativa painéis padrão para usarmos os nossos customizados
          panels: { defaults: [] },
          storageManager: false,
          // Gerenciadores injetados nos nossos DIVs React
          blockManager: {
            appendTo: blocksRef.current,
          },
          styleManager: {
            appendTo: stylesRef.current,
            sectors: [
                { name: 'Dimensões', open: false, buildProps: ['width', 'min-height', 'padding', 'margin'] },
                { name: 'Tipografia', open: false, buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align'] },
                { name: 'Decoração', open: false, buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'] },
                { name: 'Extra', open: false, buildProps: ['opacity', 'cursor', 'display'] }
            ]
          },
          traitManager: {
            appendTo: traitsRef.current,
          },
          layerManager: {
            appendTo: layersRef.current,
          },
          selectorManager: {
            componentFirst: true, // Seleciona o componente ao invés da classe primeiro
          },
          deviceManager: {
            devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile', width: '375px', widthMedia: '480px' },
            ]
          },
        });

        editorInstanceRef.current = editorInstance;
        setEditor(editorInstance);

        editorInstance.on('load', () => {
          if (!isMounted) return;
          setIsEditorReady(true);
          
          // Configurações e Blocos
          try {
            addBlocks(editorInstance);
            injectTailwind(editorInstance);
            
            // Evento: Ao selecionar um componente, mudar para aba de Estilos ou Configuração
            editorInstance.on('component:selected', () => {
                const selected = editorInstance.getSelected();
                if (selected) {
                    // Se for um link ou imagem, talvez o usuário queira ver os Traits (href, src)
                    if (selected.is('link') || selected.is('image') || selected.is('map')) {
                        setActiveTab('traits'); 
                    } else {
                        setActiveTab('styles');
                    }
                }
            });
          } catch(e) {
            console.warn("Erro ao configurar editor:", e);
          }
        });

      } catch (error: any) {
        console.error('Erro ao iniciar GrapesJS:', error);
        setToast({ message: "Falha ao carregar editor.", type: 'error' });
      }
    };

    initializeEditor();

    return () => {
      isMounted = false;
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, []);

  const injectTailwind = (ed: any) => {
      const frameEl = ed.Canvas.getFrameEl();
      const head = frameEl?.contentDocument?.head;
      if (head) {
          const script = document.createElement('script');
          script.src = "https://cdn.tailwindcss.com";
          head.appendChild(script);
          
          // FontAwesome e Fontes
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
          head.appendChild(link);

          const style = document.createElement('style');
          style.innerHTML = `
            body { background-color: #f9fafb; color: #1f2937; overflow-x: hidden; font-family: sans-serif; }
            a { cursor: pointer; }
            section { position: relative; }
            /* Highlight outline para visualizar elementos */
            *:hover { outline: 1px dashed rgba(16, 185, 129, 0.3); }
            .gjs-selected { outline: 2px solid #10b981 !important; outline-offset: -2px; }
          `;
          head.appendChild(style);
      }
  };

  // Actions
  const handleDeviceChange = (device: string) => {
    if (!editor) return;
    setActiveDevice(device);
    const deviceMap: Record<string, string> = { 'Desktop': '', 'Tablet': 'Tablet', 'Mobile': 'Mobile' };
    editor.setDevice(deviceMap[device]);
  };

  const handleApplyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    if (!editor) return;
    const html = sanitizeHtml(TEMPLATES[templateKey]);
    if (html) {
      editor.setComponents(html);
      setShowTemplateModal(false);
      setToast({ message: "Template aplicado!", type: 'success' });
    }
  };

  const handleAction = (action: string) => {
    if (!editor) return;
    switch(action) {
      case 'undo': editor.runCommand('core:undo'); break;
      case 'redo': editor.runCommand('core:redo'); break;
      case 'view': 
        const isPreview = editor.isPreview();
        isPreview ? editor.stopCommand('preview') : editor.runCommand('preview');
        break;
      case 'clear': 
        if(confirm('Limpar tudo?')) editor.runCommand('core:canvas-clear'); 
        break;
    }
  };

  const handleDownload = () => {
    if (editor) {
      const html = editor.getHtml();
      const css = editor.getCss();
      const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Landing Page</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>${css}</style></head><body class="bg-gray-50 font-sans">${html}</body></html>`;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `landing-page-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast({ message: "HTML exportado!", type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 animate-fade-in font-sans">
      
      {/* 1. TOP TOOLBAR */}
      <div className="h-16 bg-gray-950 border-b border-gray-800 flex justify-between items-center px-4 shadow-md z-20 shrink-0">
        <div className="flex items-center gap-4">
            <span className="text-green-500 font-bold flex items-center gap-2">
                <i className="fas fa-layer-group"></i> <span className="hidden md:inline">Editor Pro</span>
            </span>
            <div className="h-6 w-px bg-gray-800"></div>
            <button onClick={() => setShowTemplateModal(true)} className="text-gray-400 hover:text-white text-xs font-bold bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition">
                <i className="fas fa-th-large mr-2"></i> Templates
            </button>
        </div>

        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {['Desktop', 'Tablet', 'Mobile'].map(dev => (
                <button key={dev} onClick={() => handleDeviceChange(dev)} className={`w-8 h-8 flex items-center justify-center rounded transition ${activeDevice === dev ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    <i className={`fas fa-${dev === 'Desktop' ? 'desktop' : dev === 'Tablet' ? 'tablet-alt' : 'mobile-alt'}`}></i>
                </button>
            ))}
        </div>

        <div className="flex items-center gap-3">
            <div className="flex gap-1 mr-2 bg-gray-800 rounded p-1">
                <button onClick={() => handleAction('undo')} className="w-8 h-8 text-gray-400 hover:text-white rounded transition"><i className="fas fa-undo"></i></button>
                <button onClick={() => handleAction('redo')} className="w-8 h-8 text-gray-400 hover:text-white rounded transition"><i className="fas fa-redo"></i></button>
                <button onClick={() => handleAction('view')} className="w-8 h-8 text-blue-400 hover:text-white rounded transition" title="Preview"><i className="fas fa-eye"></i></button>
                <button onClick={() => handleAction('clear')} className="w-8 h-8 text-red-500 hover:bg-red-900/20 rounded transition"><i className="fas fa-trash-alt"></i></button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-bold px-3">Sair</button>
            <button onClick={handleDownload} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition">
                <i className="fas fa-download"></i> Baixar
            </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Canvas Area (Esquerda/Centro) */}
        <div className="flex-1 relative bg-[#111827] overflow-hidden flex flex-col justify-center">
            {!isEditorReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-gray-500">
                    <i className="fas fa-circle-notch fa-spin text-3xl mb-2 text-green-500"></i>
                    <p>Iniciando Motor Visual...</p>
                </div>
            )}
            {/* O GrapesJS monta o iframe aqui */}
            <div ref={editorRef} className="h-full w-full" />
        </div>

        {/* Sidebar de Ferramentas (Direita) */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 z-30 shadow-xl">
            
            {/* Abas */}
            <div className="flex border-b border-gray-800 bg-gray-950">
                <button onClick={() => setActiveTab('blocks')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'blocks' ? 'text-green-500 border-green-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    <i className="fas fa-th-large mb-1 block text-sm"></i> Blocos
                </button>
                <button onClick={() => setActiveTab('styles')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'styles' ? 'text-blue-500 border-blue-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    <i className="fas fa-paint-brush mb-1 block text-sm"></i> Estilo
                </button>
                <button onClick={() => setActiveTab('traits')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'traits' ? 'text-yellow-500 border-yellow-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    <i className="fas fa-cog mb-1 block text-sm"></i> Config
                </button>
                <button onClick={() => setActiveTab('layers')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'layers' ? 'text-purple-500 border-purple-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    <i className="fas fa-layer-group mb-1 block text-sm"></i> Camadas
                </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-1">
                
                {/* 1. Blocos */}
                <div ref={blocksRef} className={activeTab === 'blocks' ? 'block' : 'hidden'}></div>
                
                {/* 2. Estilos */}
                <div className={activeTab === 'styles' ? 'block' : 'hidden'}>
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400 mb-2">
                        <i className="fas fa-info-circle mr-1"></i> Selecione um elemento no canvas para editar.
                    </div>
                    <div ref={stylesRef}></div>
                </div>

                {/* 3. Traits (Configurações do Elemento: href, src, etc) */}
                <div className={activeTab === 'traits' ? 'block' : 'hidden'}>
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400 mb-2">
                        <i className="fas fa-link mr-1"></i> Edite links, IDs e atributos.
                    </div>
                    <div ref={traitsRef}></div>
                </div>

                {/* 4. Camadas */}
                <div ref={layersRef} className={activeTab === 'layers' ? 'block' : 'hidden'}></div>

            </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && isEditorReady && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-700">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <div>
                        <h3 className="text-xl font-bold text-white">Escolha um Template</h3>
                        <p className="text-sm text-gray-400">Comece com uma estrutura profissional de alta conversão.</p>
                    </div>
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto bg-gray-900/50 grid md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div onClick={() => handleApplyTemplate('saas_dark')} className="group cursor-pointer bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-900/30 px-2 py-1 rounded">SaaS / Tech</span>
                            <h4 className="text-white font-bold text-lg mt-1">SaaS Dark Pro</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-layer-group text-6xl text-gray-700 group-hover:text-blue-500 transition duration-500"></i>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div onClick={() => handleApplyTemplate('ebook_sales')} className="group cursor-pointer bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-amber-500 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-900/30 px-2 py-1 rounded">Infoproduto</span>
                            <h4 className="text-white font-bold text-lg mt-1">Venda de Ebook</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-book-open text-6xl text-gray-700 group-hover:text-amber-500 transition duration-500"></i>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div onClick={() => handleApplyTemplate('webinar')} className="group cursor-pointer bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-indigo-400 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-900/30 px-2 py-1 rounded">Lead Magnet</span>
                            <h4 className="text-white font-bold text-lg mt-1">Webinar / Aula</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-microphone text-6xl text-gray-700 group-hover:text-indigo-400 transition duration-500"></i>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-end">
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white font-bold text-sm">Começar do Zero (ou com conteúdo da IA)</button>
                </div>
            </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
