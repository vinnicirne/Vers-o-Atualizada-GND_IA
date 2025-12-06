
import React, { useRef, useEffect, useState } from 'react';
import { Toast } from './admin/Toast';
import { TEMPLATES } from './landing-page/templates';
import { addBlocks } from './landing-page/blocks';

interface LandingPageBuilderProps {
  initialHtml: string;
  onClose: () => void;
}

const sanitizeHtml = (html: string): string => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        doc.querySelectorAll('nav').forEach(el => el.remove());
        return doc.body.innerHTML;
    } catch (e) {
        return html;
    }
};

export function LandingPageBuilder({ initialHtml, onClose }: LandingPageBuilderProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Refs para os Containers de UI
  const blocksRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  
  const editorInstanceRef = useRef<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  // Controle de Abas
  const [leftTab, setLeftTab] = useState<'blocks' | 'layers'>('blocks');
  const [rightTab, setRightTab] = useState<'styles' | 'traits'>('styles');
  
  // Estado de Preview (Expansão)
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [showTemplateModal, setShowTemplateModal] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeEditor = async () => {
      if (!editorRef.current) return;
      if (editorInstanceRef.current) return;

      let processedHtml = initialHtml;
      // Se o HTML for curto (provavelmente vazio ou placeholder), mostra modal. Se for conteúdo real (ex: imagem gerada), esconde modal.
      if (initialHtml && initialHtml.length > 100) {
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
          components: processedHtml || '<body class="bg-gray-900"><div style="padding: 50px; text-align: center; color: white;">Arraste blocos aqui...</div></body>',
          // Desativa a UI padrão para usarmos customizada
          panels: { defaults: [] },
          storageManager: false,
          
          // Configuração dos Painéis
          blockManager: {
            appendTo: blocksRef.current,
          },
          layerManager: {
            appendTo: layersRef.current,
          },
          traitManager: {
            appendTo: traitsRef.current,
          },
          selectorManager: {
            appendTo: '#selectors-container', // Container auxiliar se necessário
            componentFirst: true,
          },
          styleManager: {
            appendTo: stylesRef.current,
            sectors: [
                {
                    name: 'Layout',
                    open: false,
                    buildProps: ['display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap'],
                    properties: [
                        { name: 'Display', property: 'display', type: 'select', defaults: 'block', list: [ { value: 'block', name: 'Bloco' }, { value: 'flex', name: 'Flex' }, { value: 'grid', name: 'Grid' }, { value: 'inline-block', name: 'Inline' } ] }
                    ]
                },
                {
                    name: 'Dimensões',
                    open: false,
                    buildProps: ['width', 'height', 'min-height', 'margin', 'padding'],
                },
                {
                    name: 'Tipografia',
                    open: true, // Aberto por padrão
                    buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration'],
                },
                {
                    name: 'Decoração',
                    open: false,
                    buildProps: ['background-color', 'background-image', 'border-radius', 'border', 'box-shadow'],
                },
                {
                    name: 'Filtros & Efeitos',
                    open: true,
                    buildProps: ['opacity', 'mix-blend-mode', 'cursor', 'filter', 'transform'],
                    properties: [
                        { 
                            name: 'Filtros (CSS)', 
                            property: 'filter', 
                            type: 'text', 
                            defaults: '', 
                            placeholder: 'ex: brightness(1.2) contrast(1.5) blur(5px)' 
                        },
                        { 
                            name: 'Blend Mode', 
                            property: 'mix-blend-mode', 
                            type: 'select', 
                            defaults: 'normal', 
                            list: [
                                { value: 'normal', name: 'Normal' },
                                { value: 'multiply', name: 'Multiply' },
                                { value: 'screen', name: 'Screen' },
                                { value: 'overlay', name: 'Overlay' },
                                { value: 'darken', name: 'Darken' },
                                { value: 'lighten', name: 'Lighten' },
                                { value: 'difference', name: 'Difference' },
                                { value: 'exclusion', name: 'Exclusion' },
                                { value: 'hue', name: 'Hue' },
                                { value: 'saturation', name: 'Saturation' },
                                { value: 'luminosity', name: 'Luminosity' }
                            ] 
                        }
                    ]
                },
                {
                    name: 'Extra',
                    open: false,
                    buildProps: ['transition', 'overflow'],
                }
            ]
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
          
          try {
            addBlocks(editorInstance);
            injectTailwind(editorInstance);
            
            // Auto-seleção de aba
            editorInstance.on('component:selected', () => {
                const selected = editorInstance.getSelected();
                if (selected) {
                    // Sempre foca em estilos ao selecionar
                    setRightTab('styles');
                }
            });
          } catch(e) {
            console.warn("Erro config editor:", e);
          }
        });

      } catch (error: any) {
        console.error('Erro GrapesJS:', error);
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
          
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
          head.appendChild(link);

          const style = document.createElement('style');
          style.innerHTML = `
            body { background-color: #111827; color: #f3f4f6; overflow-x: hidden; font-family: sans-serif; }
            a { cursor: pointer; }
            /* Outline visual para facilitar edição */
            *:hover { outline: 1px dashed rgba(16, 185, 129, 0.3); }
            .gjs-selected { outline: 2px solid #10b981 !important; outline-offset: -2px; }
          `;
          head.appendChild(style);
      }
  };

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
        // Toggle Preview Mode
        const nextState = !isPreviewMode;
        setIsPreviewMode(nextState);
        if (nextState) {
            editor.runCommand('preview');
        } else {
            editor.stopCommand('preview');
        }
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
      a.download = `site-gdn-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast({ message: "HTML exportado!", type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 animate-fade-in font-sans h-screen w-screen overflow-hidden">
      
      {/* 1. TOP TOOLBAR */}
      <div className="h-16 bg-gray-950 border-b border-gray-800 flex justify-between items-center px-6 shadow-md z-20 shrink-0">
        
        {/* Left: Branding & Templates */}
        <div className="flex items-center gap-6">
            <span className="text-green-500 font-bold flex items-center gap-2 text-lg tracking-tight">
                <i className="fas fa-cubes"></i> <span className="hidden md:inline">Editor Pro</span>
            </span>
            <div className="h-6 w-px bg-gray-800"></div>
            <button onClick={() => setShowTemplateModal(true)} className="text-gray-400 hover:text-white text-xs font-bold bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition flex items-center gap-2">
                <i className="fas fa-th-large"></i> Templates
            </button>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {['Desktop', 'Tablet', 'Mobile'].map(dev => (
                <button 
                    key={dev} 
                    onClick={() => handleDeviceChange(dev)} 
                    className={`w-9 h-9 flex items-center justify-center rounded-md transition ${activeDevice === dev ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'}`}
                    title={dev}
                >
                    <i className={`fas fa-${dev === 'Desktop' ? 'desktop' : dev === 'Tablet' ? 'tablet-alt' : 'mobile-alt'}`}></i>
                </button>
            ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <button onClick={() => handleAction('undo')} className="w-9 h-9 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition flex items-center justify-center" title="Desfazer"><i className="fas fa-undo"></i></button>
                <button onClick={() => handleAction('redo')} className="w-9 h-9 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition flex items-center justify-center" title="Refazer"><i className="fas fa-redo"></i></button>
                <div className="h-6 w-px bg-gray-800 mx-1"></div>
                <button 
                    onClick={() => handleAction('view')} 
                    className={`w-9 h-9 rounded-md transition flex items-center justify-center ${isPreviewMode ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'text-blue-400 hover:text-white hover:bg-blue-900/30'}`} 
                    title={isPreviewMode ? "Sair do Preview" : "Visualizar (Preview)"}
                >
                    <i className={`fas ${isPreviewMode ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
                <button onClick={() => handleAction('clear')} className="w-9 h-9 text-red-500 hover:text-white hover:bg-red-900/30 rounded-md transition flex items-center justify-center" title="Limpar Tudo"><i className="fas fa-trash-alt"></i></button>
            </div>
            
            <div className="flex items-center gap-3 border-l border-gray-800 pl-4">
                <button onClick={onClose} className="text-gray-500 hover:text-white text-xs font-bold px-2 py-2 rounded hover:bg-gray-800 transition">Sair</button>
                <button onClick={handleDownload} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 transition transform hover:-translate-y-0.5">
                    <i className="fas fa-download"></i> Exportar
                </button>
            </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (3 Columns) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* === COLUNA ESQUERDA: BLOCOS E LAYERS === */}
        <div className={`w-[280px] bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 z-10 transition-all duration-300 ${isPreviewMode ? 'hidden' : 'flex'}`}>
            {/* Tabs Esquerda */}
            <div className="flex border-b border-gray-800 bg-gray-950">
                <button 
                    onClick={() => setLeftTab('blocks')} 
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition border-b-2 ${leftTab === 'blocks' ? 'text-green-500 border-green-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'}`}
                >
                    <i className="fas fa-th-large mr-2"></i> Blocos
                </button>
                <button 
                    onClick={() => setLeftTab('layers')} 
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition border-b-2 ${leftTab === 'layers' ? 'text-blue-500 border-blue-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'}`}
                >
                    <i className="fas fa-layer-group mr-2"></i> Camadas
                </button>
            </div>
            
            {/* Conteúdo Esquerda */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-2">
                <div ref={blocksRef} className={leftTab === 'blocks' ? 'block' : 'hidden'}></div>
                <div ref={layersRef} className={leftTab === 'layers' ? 'block' : 'hidden'}></div>
            </div>
        </div>

        {/* === COLUNA CENTRAL: CANVAS === */}
        <div className="flex-1 relative bg-[#111827] overflow-hidden flex flex-col justify-center shadow-inner">
            {!isEditorReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-gray-500">
                    <i className="fas fa-circle-notch fa-spin text-3xl mb-2 text-green-500"></i>
                    <p className="text-xs font-mono uppercase tracking-widest">Carregando Editor...</p>
                </div>
            )}
            <div ref={editorRef} className="h-full w-full outline-none" />
        </div>

        {/* === COLUNA DIREITA: ESTILOS E CONFIGURAÇÕES === */}
        <div className={`w-[300px] bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 z-10 transition-all duration-300 ${isPreviewMode ? 'hidden' : 'flex'}`}>
            {/* Tabs Direita */}
            <div className="flex border-b border-gray-800 bg-gray-950">
                <button 
                    onClick={() => setRightTab('styles')} 
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition border-b-2 ${rightTab === 'styles' ? 'text-purple-500 border-purple-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'}`}
                >
                    <i className="fas fa-paint-brush mr-2"></i> Estilo
                </button>
                <button 
                    onClick={() => setRightTab('traits')} 
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition border-b-2 ${rightTab === 'traits' ? 'text-yellow-500 border-yellow-500 bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'}`}
                >
                    <i className="fas fa-cog mr-2"></i> Config
                </button>
            </div>

            {/* Conteúdo Direita */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Estilos */}
                <div className={rightTab === 'styles' ? 'block' : 'hidden'}>
                    <div id="selectors-container" className="p-2 border-b border-gray-800"></div>
                    <div ref={stylesRef}></div>
                </div>

                {/* Traits / Configs */}
                <div className={rightTab === 'traits' ? 'block' : 'hidden'}>
                    <div className="p-4 text-center">
                        <div className="mb-4 text-gray-500 text-xs">
                            <i className="fas fa-info-circle mr-1"></i> Selecione um elemento para configurar atributos (Links, IDs, etc).
                        </div>
                    </div>
                    <div ref={traitsRef}></div>
                </div>
            </div>
        </div>

      </div>

      {/* Template Modal */}
      {showTemplateModal && isEditorReady && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-700">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                    <div>
                        <h3 className="text-xl font-bold text-white">Escolha um Template</h3>
                        <p className="text-sm text-gray-400">Comece com uma estrutura profissional de alta conversão.</p>
                    </div>
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-500 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto bg-gray-900 grid md:grid-cols-3 gap-6">
                    {Object.keys(TEMPLATES).map((key) => (
                        <div key={key} onClick={() => handleApplyTemplate(key as any)} className="group cursor-pointer bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-green-500 transition shadow-lg relative h-48 flex items-center justify-center hover:shadow-green-900/20">
                            <div className="text-center group-hover:-translate-y-1 transition duration-300">
                                <i className="fas fa-file-code text-4xl text-gray-600 group-hover:text-green-500 mb-3 transition"></i>
                                <h4 className="text-gray-300 group-hover:text-white font-bold uppercase text-sm tracking-wide">{key.replace('_', ' ')}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-end">
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wide">Pular / Começar do Zero</button>
                </div>
            </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
