
import React, { useState, useEffect, useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup'; // For HTML
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Custom debounce hook for performance optimization
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

interface LiveHTMLEditorProps {
  initialHtml: string;
}

export const LiveHTMLEditor: React.FC<LiveHTMLEditorProps> = ({ initialHtml }) => {
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const debouncedHtmlContent = useDebounce(htmlContent, 300); // Debounce updates by 300ms
  const [copySuccess, setCopySuccess] = useState('');

  const iframeContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <title>Live Preview</title>
      <style>
        body { margin: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #2d2d2d; }
        ::-webkit-scrollbar-thumb { background: #555; }
        ::-webkit-scrollbar-thumb:hover { background: #666; }
      </style>
    </head>
    <body>
      ${debouncedHtmlContent}
    </body>
    </html>
  `;

  const handleExport = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landing-page.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent).then(() => {
      setCopySuccess('Copiado!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Falhou!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };
  
  const handleReset = () => {
    if(window.confirm("Você tem certeza que quer descartar suas alterações e voltar ao código original da IA?")) {
      setHtmlContent(initialHtml);
    }
  };

  const ToolButton: React.FC<{ onClick: () => void; icon: string; text: string; successText?: string }> = ({ onClick, icon, text, successText }) => (
    <button onClick={onClick} className="px-3 py-1.5 text-xs font-bold text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2">
      <i className={`fas ${successText ? 'fa-check text-green-400' : icon}`}></i>
      {successText || text}
    </button>
  );

  return (
    <div className="bg-black/30 border border-green-900/40 rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in-up">
      <div className="p-3 bg-black/40 border-b border-green-900/30 flex justify-between items-center">
        <h3 className="font-bold text-green-400 text-sm">Editor de Landing Page ao Vivo</h3>
        <div className="flex items-center gap-3">
          <ToolButton onClick={handleCopy} icon="fa-copy" text="Copiar Código" successText={copySuccess} />
          <ToolButton onClick={handleReset} icon="fa-undo" text="Resetar" />
          <button onClick={handleExport} className="px-3 py-1.5 text-xs font-bold text-black bg-green-600 rounded-md hover:bg-green-500 transition flex items-center gap-2">
            <i className="fas fa-download"></i>
            Exportar HTML
          </button>
        </div>
      </div>
      
      <PanelGroup direction="horizontal" className="h-[70vh]">
        {/* Editor Panel */}
        <Panel defaultSize={50} minSize={20}>
          <div className="h-full w-full code-editor-container overflow-auto">
            <Editor
              value={htmlContent}
              onValueChange={code => setHtmlContent(code)}
              highlight={code => Prism.highlight(code, Prism.languages.markup, 'markup')}
              padding={16}
              className="font-mono text-xs"
            />
          </div>
        </Panel>
        
        <PanelResizeHandle className="w-2 bg-black/50 hover:bg-green-900/50 transition-colors flex items-center justify-center">
            <div className="w-px h-8 bg-green-700/50"></div>
        </PanelResizeHandle>

        {/* Preview Panel */}
        <Panel defaultSize={50} minSize={20}>
          <div className="h-full bg-white">
            <iframe
              srcDoc={iframeContent}
              title="Live Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};
