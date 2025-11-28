
import React, { useRef, useEffect, useState } from 'react';
import { Toast } from './admin/Toast';

interface LandingPageBuilderProps {
  initialHtml: string;
  onClose: () => void;
}

export function LandingPageBuilder({ initialHtml, onClose }: LandingPageBuilderProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let editorInstance: any = null;

    const initializeEditor = async () => {
      if (!editorContainerRef.current) return;

      try {
        // Dynamic import to prevent SSR issues and ensure controlled loading
        // @ts-ignore
        const grapesjsModule = await import('grapesjs');
        const GrapesJS = grapesjsModule.default || grapesjsModule;

        // Clean initialization without plugins to avoid 'BlockManager undefined' errors
        editorInstance = GrapesJS.init({
          container: editorContainerRef.current,
          components: initialHtml || '<div>Comece a editar...</div>',
          height: '100%',
          width: '100%',
          panels: { defaults: [] },
          storageManager: { type: 'local', autosave: false, autoload: false },
          plugins: [], // Zero plugins at startup for stability
          // FIX: Custom Rich Text Editor actions to ensure Link works
          richTextEditor: {
            actions: [
              'bold', 'italic', 'underline', 'strikethrough',
              {
                name: 'link',
                icon: '<i class="fa fa-link"></i>',
                attributes: { title: 'Inserir Link' },
                result: (rte: any) => {
                  const url = window.prompt('Digite a URL do link (https://...):', 'https://');
                  if (url) rte.exec('createLink', url);
                }
              },
              {
                 name: 'unlink',
                 icon: '<i class="fa fa-unlink"></i>',
                 attributes: { title: 'Remover Link' },
                 result: (rte: any) => rte.exec('unlink')
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

        // Safe configuration after 'load' event
        editorInstance.on('load', () => {
          setEditor(editorInstance);
          setIsEditorReady(true);

          // Inject CSS for correct Canvas (Iframe) visualization
          const frameEl = editorInstance.Canvas.getFrameEl();
          if (frameEl) {
              const head = frameEl.contentDocument?.head;
              if (head) {
                  // Tailwind CDN
                  const script = document.createElement('script');
                  script.src = "https://cdn.tailwindcss.com";
                  head.appendChild(script);
                  
                  // Base Styles
                  // FIX: Adicionado padding para toolbar não cobrir conteúdo e estilo para links
                  const style = document.createElement('style');
                  style.innerHTML = `
                    body { 
                        background-color: #111827; 
                        color: #f3f4f6; 
                        font-family: sans-serif;
                        padding-top: 60px; 
                        padding-bottom: 60px;
                        padding-left: 20px;
                        padding-right: 20px;
                        min-height: 100vh;
                    }
                    /* Visualização clara de links no editor */
                    a { color: #60a5fa; text-decoration: underline; cursor: pointer; }
                    ::-webkit-scrollbar { width: 8px; background: #000; }
                    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                  `;
                  head.appendChild(style);
              }
          }

          // Add blocks only when BlockManager is guaranteed to exist
          addEssentialBlocks(editorInstance);
        });

      } catch (error) {
        console.error('Error initializing editor:', error);
        setToast({ message: "Falha ao carregar o editor visual.", type: 'error' });
      }
    };

    initializeEditor();

    // Cleanup
    return () => {
      if (editorInstance) {
        try {
            editorInstance.destroy();
        } catch (e) {
            console.error("Error destroying editor:", e);
        }
      }
      setEditor(null);
      setIsEditorReady(false);
    };
  }, [initialHtml]);

  const addEssentialBlocks = (ed: any) => {
    if (!ed || !ed.BlockManager) return;

    const blocks = [
      {
        id: 'hero-section',
        label: 'Hero Section',
        category: 'Estrutura',
        content: `
          <section class="relative bg-gray-900 text-white py-20 px-6 text-center">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-5xl font-bold mb-6">Título Principal</h1>
              <p class="text-xl text-gray-300 mb-8">Subtítulo persuasivo para sua audiência.</p>
              <button class="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded-lg text-lg transition">Ação Principal</button>
            </div>
          </section>
        `
      },
      {
        id: 'features-grid',
        label: 'Grid de Benefícios',
        category: 'Conteúdo',
        content: `
          <section class="py-16 bg-black">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
              <div class="p-6 bg-gray-800 rounded-xl border border-gray-700">
                <h3 class="text-xl font-bold text-green-400 mb-2">Benefício 1</h3>
                <p class="text-gray-400">Descrição do benefício.</p>
              </div>
              <div class="p-6 bg-gray-800 rounded-xl border border-gray-700">
                <h3 class="text-xl font-bold text-green-400 mb-2">Benefício 2</h3>
                <p class="text-gray-400">Descrição do benefício.</p>
              </div>
              <div class="p-6 bg-gray-800 rounded-xl border border-gray-700">
                <h3 class="text-xl font-bold text-green-400 mb-2">Benefício 3</h3>
                <p class="text-gray-400">Descrição do benefício.</p>
              </div>
            </div>
          </section>
        `
      },
      {
        id: 'text-block',
        label: 'Bloco de Texto',
        category: 'Básico',
        content: '<div class="p-4 text-gray-300"><p>Insira seu texto aqui...</p></div>'
      },
      {
        id: 'image-block',
        label: 'Imagem',
        category: 'Básico',
        content: '<img src="https://via.placeholder.com/600x400" alt="Placeholder" class="w-full h-auto rounded-lg shadow-lg" />'
      },
      {
        id: 'cta-section',
        label: 'Chamada para Ação',
        category: 'Estrutura',
        content: '<section class="py-20 bg-green-900/20 text-center border-t border-green-900/50"><div class="max-w-2xl mx-auto px-4"><h2 class="text-3xl font-bold text-white mb-6">Pronto para começar?</h2><button class="bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105">Inscreva-se Agora</button></div></section>'
      }
    ];

    blocks.forEach(block => {
        // Check if block exists to avoid duplicate error on fast remounts
        if(ed.BlockManager.get(block.id)) return;
        
        ed.BlockManager.add(block.id, {
            label: block.label,
            category: block.category,
            content: block.content,
            attributes: { class: 'fa fa-cube' }
        });
    });
  };

  const handleSave = () => {
    if (editor && isEditorReady) {
      const html = editor.getHtml();
      const css = editor.getCss();
      
      const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page Gerada - GDN_IA</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${css}</style>
</head>
<body class="bg-black text-gray-200 font-sans">
    ${html}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `landing-page-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setToast({ message: "HTML exportado com sucesso!", type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 animate-fade-in">
      {/* Header / Toolbar */}
      <div className="h-16 border-b border-gray-800 bg-gray-950 flex justify-between items-center px-6 shadow-md z-10">
        <div className="flex items-center gap-3">
            <span className="text-green-500 font-bold text-lg"><i className="fas fa-layer-group mr-2"></i>Editor Visual</span>
            <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">Modo Seguro</span>
        </div>
        
        <div className="flex gap-3">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg text-sm font-medium transition border border-gray-700"
            >
                Cancelar
            </button>
            <button
                onClick={handleSave}
                disabled={!isEditorReady}
                className="px-5 py-2 bg-green-600 text-black hover:bg-green-500 rounded-lg text-sm font-bold transition shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                <i className="fas fa-download"></i> Baixar HTML
            </button>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {!isEditorReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <i className="fas fa-spinner fa-spin text-4xl text-green-500"></i>
                <span className="ml-4 text-gray-400">Carregando Editor...</span>
            </div>
        )}
        <div ref={editorContainerRef} className="h-full w-full" />
      </div>
      
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
