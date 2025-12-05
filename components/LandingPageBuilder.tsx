
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
        
        // 1. Remove tags <nav> explicitamente
        doc.querySelectorAll('nav').forEach(el => el.remove());
        
        // 2. Remove tags <ul> dentro de <header> (padrão comum de menu)
        doc.querySelectorAll('header ul').forEach(el => el.remove());
        
        // 3. Remove links soltos no header que NÃO sejam botões (CTAs)
        // Heurística: Se não tem classe de botão, remove.
        doc.querySelectorAll('header a').forEach(el => {
            const className = el.className.toLowerCase();
            // Mantém se parecer um botão (bg-, btn, button, rounded)
            if (!className.includes('bg-') && !className.includes('btn') && !className.includes('button') && !className.includes('rounded')) {
                el.remove();
            }
        });

        // 4. Remove links comuns de navegação pelo texto (Home, Sobre, etc) caso tenham escapado
        const forbiddenTexts = ['home', 'sobre', 'serviços', 'contato', 'preços', 'blog', 'about', 'services', 'contact'];
        doc.querySelectorAll('a').forEach(el => {
            if (forbiddenTexts.includes(el.innerText.trim().toLowerCase())) {
                // Verificação dupla: se não parece botão, remove
                const className = el.className.toLowerCase();
                if (!className.includes('bg-') && !className.includes('btn')) {
                    el.remove();
                }
            }
        });

        return doc.body.innerHTML;
    } catch (e) {
        console.warn("Erro ao sanitizar HTML:", e);
        return html; // Fallback para HTML original se der erro no parser
    }
};

export function LandingPageBuilder({ initialHtml, onClose }: LandingPageBuilderProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null); // Ref para manter a instância do editor
  const [editor, setEditor] = useState<any>(null); // State para interações da UI
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [showTemplateModal, setShowTemplateModal] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Inicialização do Editor
  useEffect(() => {
    let isMounted = true;
    console.log("[LandingPageBuilder] Componente montado. Iniciando ciclo de vida...");

    const initializeEditor = async () => {
      // Pequeno delay para garantir que o DOM (div container) foi montado pelo React e limpo
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!isMounted) {
          console.log("[LandingPageBuilder] Componente desmontado antes do init. Cancelando.");
          return;
      }

      if (!editorContainerRef.current) {
          console.error("[LandingPageBuilder] Container ref não encontrado!");
          setInitError("Erro: Container do editor não encontrado no DOM.");
          return;
      }

      if (editorInstanceRef.current) {
          console.warn("[LandingPageBuilder] Editor já inicializado. Evitando duplicidade.");
          return; 
      }

      // Se houver HTML inicial válido da IA (> 50 chars), não force o modal
      let processedHtml = initialHtml;
      if (initialHtml && initialHtml.length > 50) {
          // SANITIZAÇÃO AUTOMÁTICA: Remove menus antes de carregar
          processedHtml = sanitizeHtml(initialHtml);
          setShowTemplateModal(false);
      }

      try {
        console.log("[LandingPageBuilder] Importando GrapesJS...");
        // @ts-ignore
        const grapesjsModule = await import('grapesjs');
        const GrapesJS: any = grapesjsModule.default || grapesjsModule;

        if (!isMounted) return;

        // Limpa o container explicitamente para evitar erros de appendChild em nós sujos
        if(editorContainerRef.current) {
            editorContainerRef.current.innerHTML = '';
        }

        console.log("[LandingPageBuilder] Inicializando GrapesJS...");
        const editorInstance = GrapesJS.init({
          container: editorContainerRef.current,
          components: processedHtml || '<body><div style="padding: 20px;">Comece a editar...</div></body>',
          height: '100%',
          width: 'auto',
          fromElement: false, 
          panels: { defaults: [] }, 
          storageManager: false, 
          plugins: [],
          deviceManager: {
            devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile', width: '375px', widthMedia: '480px' },
            ]
          },
          // REMOVED custom richTextEditor config to prevent 'appendChild' error on invalid node creation
        });

        console.log("[LandingPageBuilder] GrapesJS init success.");
        editorInstanceRef.current = editorInstance;
        setEditor(editorInstance);

        editorInstance.on('load', () => {
          console.log("[LandingPageBuilder] Editor loaded completely.");
          if (!isMounted) return;
          setIsEditorReady(true);
          try {
            injectTailwind(editorInstance);
            addBlocks(editorInstance);
          } catch(e) {
            console.warn("Erro não fatal ao injetar assets:", e);
          }
        });

      } catch (error: any) {
        console.error('[LandingPageBuilder] CRITICAL ERROR:', error);
        setInitError(`Falha ao iniciar editor: ${error.message || error}`);
        setToast({ message: "Falha ao carregar editor. Verifique o console.", type: 'error' });
      }
    };

    initializeEditor();

    return () => {
      console.log("[LandingPageBuilder] Desmontando componente...");
      isMounted = false;
      if (editorInstanceRef.current) {
        try {
            console.log("[LandingPageBuilder] Destruindo instância GrapesJS.");
            editorInstanceRef.current.destroy();
        } catch(e) {
            console.warn("[LandingPageBuilder] Erro ao destruir editor:", e);
        }
        editorInstanceRef.current = null;
      }
    };
  }, []); // Run once

  const injectTailwind = (ed: any) => {
      const frameEl = ed.Canvas.getFrameEl();
      const head = frameEl?.contentDocument?.head;
      if (head) {
          const script = document.createElement('script');
          script.src = "https://cdn.tailwindcss.com";
          head.appendChild(script);
          
          const style = document.createElement('style');
          style.innerHTML = `
            body { background-color: #ffffff; color: #1f2937; overflow-x: hidden; }
            a { cursor: pointer; }
            ::-webkit-scrollbar { width: 8px; background: #000; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
          `;
          head.appendChild(style);
      }
  };

  // --- ACTIONS ---
  const handleDeviceChange = (device: string) => {
    if (!editor) return;
    setActiveDevice(device);
    const deviceMap: Record<string, string> = { 'Desktop': '', 'Tablet': 'Tablet', 'Mobile': 'Mobile' };
    editor.setDevice(deviceMap[device]);
  };

  const handleApplyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    if (!editor) return;
    // O template já vem limpo do arquivo templates.ts, mas por segurança podemos sanitizar também
    const html = sanitizeHtml(TEMPLATES[templateKey]);
    if (html) {
      editor.setComponents(html);
      setShowTemplateModal(false);
      setToast({ message: "Template aplicado com sucesso!", type: 'success' });
    }
  };

  const handleAction = (action: string) => {
    if (!editor) return;
    switch(action) {
      case 'undo': editor.runCommand('core:undo'); break;
      case 'redo': editor.runCommand('core:redo'); break;
      case 'clear': 
        if(confirm('Tem certeza? Isso limpará todo o canvas.')) editor.runCommand('core:canvas-clear'); 
        break;
    }
  };

  const handleDownload = () => {
    if (editor) {
      const html = editor.getHtml();
      const css = editor.getCss();
      const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Landing Page</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>${css}</style></head><body class="bg-white font-sans">${html}</body></html>`;
      
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
      
      {/* TOOLBAR SUPERIOR PRO */}
      <div className="h-16 bg-gray-950 border-b border-gray-800 flex justify-between items-center px-4 shadow-md z-20">
        
        {/* Esquerda: Título e Templates */}
        <div className="flex items-center gap-4">
            <span className="text-green-500 font-bold flex items-center gap-2">
                <i className="fas fa-layer-group"></i> <span className="hidden md:inline">Editor Visual Pro</span>
            </span>
            <div className="h-6 w-px bg-gray-800"></div>
            <button 
                onClick={() => setShowTemplateModal(true)}
                className="text-gray-400 hover:text-white text-xs font-bold flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition"
            >
                <i className="fas fa-th-large"></i> Templates
            </button>
        </div>

        {/* Centro: Dispositivos */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {['Desktop', 'Tablet', 'Mobile'].map(dev => (
                <button
                    key={dev}
                    onClick={() => handleDeviceChange(dev)}
                    className={`w-8 h-8 flex items-center justify-center rounded transition ${activeDevice === dev ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    title={`Visualizar em ${dev}`}
                >
                    <i className={`fas fa-${dev === 'Desktop' ? 'desktop' : dev === 'Tablet' ? 'tablet-alt' : 'mobile-alt'}`}></i>
                </button>
            ))}
        </div>

        {/* Direita: Ações */}
        <div className="flex items-center gap-3">
            <div className="flex gap-1 mr-2">
                <button onClick={() => handleAction('undo')} className="w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"><i className="fas fa-undo"></i></button>
                <button onClick={() => handleAction('redo')} className="w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"><i className="fas fa-redo"></i></button>
                <button onClick={() => handleAction('clear')} className="w-8 h-8 text-red-500 hover:bg-red-900/20 rounded transition ml-2" title="Limpar Tudo"><i className="fas fa-trash-alt"></i></button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-bold px-3">Sair</button>
            <button onClick={handleDownload} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 transition">
                <i className="fas fa-download"></i> Baixar
            </button>
        </div>
      </div>

      {/* EDITOR CANVAS */}
      <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
        {!isEditorReady && !initError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-gray-500">
                <i className="fas fa-circle-notch fa-spin text-3xl mb-2 text-green-500"></i>
                <p>Carregando Editor...</p>
            </div>
        )}
        
        {initError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900 p-8">
                <i className="fas fa-bug text-red-500 text-4xl mb-4"></i>
                <h3 className="text-xl font-bold text-white mb-2">Erro de Inicialização</h3>
                <p className="text-red-400 bg-red-900/20 p-4 rounded border border-red-500/30 max-w-lg text-center">{initError}</p>
                <button onClick={onClose} className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold">Voltar</button>
            </div>
        )}

        <div ref={editorContainerRef} className="h-full w-full" />
      </div>

      {/* TEMPLATE MODAL */}
      {showTemplateModal && isEditorReady && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Escolha um Template</h3>
                        <p className="text-sm text-gray-500">Comece com uma estrutura profissional de alta conversão.</p>
                    </div>
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto bg-gray-100 grid md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div onClick={() => handleApplyTemplate('saas_dark')} className="group cursor-pointer bg-gray-900 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-900/30 px-2 py-1 rounded">SaaS / Tech</span>
                            <h4 className="text-white font-bold text-lg mt-1">SaaS Dark Pro</h4>
                        </div>
                        <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Popular</div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-layer-group text-6xl text-gray-700 group-hover:text-blue-500 transition duration-500"></i>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div onClick={() => handleApplyTemplate('ebook_sales')} className="group cursor-pointer bg-amber-50 rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-500 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-amber-100 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-100 px-2 py-1 rounded">Infoproduto</span>
                            <h4 className="text-gray-900 font-bold text-lg mt-1">Venda de Ebook</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-book-open text-6xl text-amber-200 group-hover:text-amber-500 transition duration-500"></i>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div onClick={() => handleApplyTemplate('webinar')} className="group cursor-pointer bg-indigo-900 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-400 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider bg-indigo-800/50 px-2 py-1 rounded">Captura de Lead</span>
                            <h4 className="text-white font-bold text-lg mt-1">Webinar / Aula</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-microphone text-6xl text-indigo-800 group-hover:text-indigo-400 transition duration-500"></i>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-500 hover:text-gray-800 font-bold text-sm">Continuar com meu conteúdo atual</button>
                </div>
            </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
