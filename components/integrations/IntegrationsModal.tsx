
import React, { useState, useEffect } from 'react';
import { WordPressConfig, AnalyticsConfig } from '../../types';
import { saveWordPressConfig, getWordPressConfig, validateWordPressConnection, clearWordPressConfig } from '../../services/wordpressService';
import { saveAnalyticsConfig, getAnalyticsConfig, clearAnalyticsConfig } from '../../services/analyticsService';
import { Toast } from '../admin/Toast';

interface IntegrationsModalProps {
  onClose: () => void;
}

export function IntegrationsModal({ onClose }: IntegrationsModalProps) {
  const [activeTab, setActiveTab] = useState('external');
  
  // WordPress State
  const [wpConfig, setWpConfig] = useState<WordPressConfig>({
    siteUrl: '',
    username: '',
    applicationPassword: '',
    isConnected: false
  });
  
  // Analytics State
  const [gaConfig, setGaConfig] = useState<AnalyticsConfig>({
      measurementId: '',
      isConnected: false
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Load WP Config
    const savedWP = getWordPressConfig();
    if (savedWP) {
        setWpConfig(savedWP);
    }

    // Load GA Config
    const savedGA = getAnalyticsConfig();
    if (savedGA) {
        setGaConfig(savedGA);
    }

    const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // --- WP HANDLERS ---
  const handleConnectWP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    setConnectionError(null);

    // Normaliza URL (remove barra final se houver)
    let url = wpConfig.siteUrl.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    const configToTest = { ...wpConfig, siteUrl: url };

    const result = await validateWordPressConnection(configToTest);

    if (result.success) {
        const finalConfig = { ...configToTest, isConnected: true };
        setWpConfig(finalConfig);
        saveWordPressConfig(finalConfig);
        setToast({ message: "WordPress conectado com sucesso!", type: 'success' });
    } else {
        const errorMsg = result.message || "Falha na conexão.";
        setToast({ message: errorMsg, type: 'error' });
        
        // Se for erro de CORS/Fetch, mostra mensagem detalhada na UI
        if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Network')) {
            setConnectionError(errorMsg);
        }
    }
    setLoading(false);
  };

  const handleDisconnectWP = () => {
      clearWordPressConfig();
      setWpConfig({ siteUrl: '', username: '', applicationPassword: '', isConnected: false });
      setToast({ message: "WordPress desconectado.", type: 'success' });
      setConnectionError(null);
  };

  // --- GA4 HANDLERS ---
  const handleConnectGA = (e: React.FormEvent) => {
      e.preventDefault();
      if(!gaConfig.measurementId.startsWith('G-')) {
          setToast({ message: "ID inválido. Deve começar com 'G-'.", type: 'error' });
          return;
      }
      
      const newConfig = { ...gaConfig, isConnected: true };
      setGaConfig(newConfig);
      saveAnalyticsConfig(newConfig);
      setToast({ message: "Google Analytics ativado!", type: 'success' });
  };

  const handleDisconnectGA = () => {
      clearAnalyticsConfig(); // Isso vai recarregar a página
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black border border-green-900/50 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-green-900/30 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-green-900/20 p-2 rounded-full">
                <i className="fas fa-plug text-green-400 text-xl"></i>
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white">Integrações Externas</h2>
                <p className="text-sm text-gray-400">Conecte o GDN_IA aos seus aplicativos favoritos.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-green-900/20 px-6 pt-4">
            <button 
                onClick={() => setActiveTab('external')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'external' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                Integrações Externas
            </button>
            <button 
                onClick={() => setActiveTab('advanced')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'advanced' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                IA & Modelos (Avançado)
            </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-black">
            {activeTab === 'external' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* WordPress Card */}
                    <div className={`p-6 rounded-xl border transition-all ${wpConfig.isConnected ? 'bg-gray-900/80 border-green-500/50' : 'bg-gray-900/30 border-gray-800'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <i className="fab fa-wordpress text-4xl text-gray-200"></i>
                                <div>
                                    <h3 className="text-lg font-bold text-white">WordPress</h3>
                                    <p className="text-xs text-gray-400 max-w-[200px]">Conecte seu site para publicar notícias geradas diretamente com um clique.</p>
                                </div>
                            </div>
                            {wpConfig.isConnected && <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded border border-green-800 font-bold">Conectado</span>}
                        </div>

                        {!wpConfig.isConnected ? (
                            <form onSubmit={handleConnectWP} className="space-y-4">
                                {connectionError && (
                                    <div className="bg-red-900/20 border border-red-500/30 p-3 rounded text-[10px] text-red-300 mb-2">
                                        <p className="font-bold mb-1"><i className="fas fa-exclamation-circle"></i> Erro de Conexão (CORS)</p>
                                        <p>{connectionError}</p>
                                        <p className="mt-2 text-gray-400">Dica: Instale o plugin <strong>"Application Passwords"</strong> e um plugin de <strong>"Enable CORS"</strong> no seu site WordPress se o problema persistir.</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">URL do Site</label>
                                    <input 
                                        type="text" 
                                        placeholder="https://meusite.com"
                                        value={wpConfig.siteUrl}
                                        onChange={e => setWpConfig({...wpConfig, siteUrl: e.target.value})}
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Usuário (Username)</label>
                                    <input 
                                        type="text" 
                                        placeholder="admin"
                                        value={wpConfig.username}
                                        onChange={e => setWpConfig({...wpConfig, username: e.target.value})}
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Application Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="xxxx xxxx xxxx xxxx"
                                        value={wpConfig.applicationPassword}
                                        onChange={e => setWpConfig({...wpConfig, applicationPassword: e.target.value})}
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                        required
                                    />
                                    <div className="flex flex-col gap-1 mt-2">
                                        <p className="text-[10px] text-gray-500">
                                            Para obter: Painel WP → Usuários → Perfil → Application Passwords.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-2 rounded transition flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <><i className="fas fa-spinner fa-spin"></i> Conectando...</> : 'Conectar'}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-green-900/10 border border-green-900/30 p-4 rounded text-sm text-gray-300">
                                    <p><strong>URL:</strong> {wpConfig.siteUrl}</p>
                                    <p><strong>Usuário:</strong> {wpConfig.username}</p>
                                </div>
                                <button 
                                    onClick={handleDisconnectWP}
                                    className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 font-bold py-2 rounded transition"
                                >
                                    Desconectar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Google Analytics 4 Card */}
                    <div className={`p-6 rounded-xl border transition-all ${gaConfig.isConnected ? 'bg-gray-900/80 border-orange-500/50' : 'bg-gray-900/30 border-gray-800'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-chart-line text-4xl text-orange-500"></i>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Google Analytics 4</h3>
                                    <p className="text-xs text-gray-400 max-w-[200px]">Ative o rastreamento para acompanhar a performance deste dashboard.</p>
                                </div>
                            </div>
                            {gaConfig.isConnected && <span className="bg-orange-900/30 text-orange-400 text-xs px-2 py-1 rounded border border-orange-800 font-bold">Ativo</span>}
                        </div>
                        
                        {!gaConfig.isConnected ? (
                            <form onSubmit={handleConnectGA} className="space-y-4">
                                <div className="bg-black/50 p-4 rounded border border-gray-800">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">ID de Medição (Measurement ID)</label>
                                    <input 
                                        type="text" 
                                        placeholder="G-XXXXXXXXXX"
                                        value={gaConfig.measurementId}
                                        onChange={e => setGaConfig({...gaConfig, measurementId: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded-md focus:border-orange-500 focus:outline-none font-mono text-sm"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        Encontre em: Admin GA4 → Fluxo de Dados (Data Streams) → ID da Medição.
                                    </p>
                                </div>
                                <button 
                                    type="submit" 
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded transition flex justify-center items-center gap-2"
                                >
                                    Ativar Rastreamento
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-orange-900/10 border border-orange-900/30 p-4 rounded text-sm text-gray-300">
                                    <p className="font-bold text-orange-400 mb-1">Rastreamento Ativo</p>
                                    <p>ID: <span className="font-mono text-white">{gaConfig.measurementId}</span></p>
                                    <p className="text-xs text-gray-500 mt-2">O script do GA4 foi injetado na aplicação.</p>
                                </div>
                                <button 
                                    onClick={handleDisconnectGA}
                                    className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 font-bold py-2 rounded transition"
                                >
                                    Desativar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'advanced' && (
                <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-microchip text-4xl mb-4"></i>
                    <p>Configurações avançadas de modelos de IA estarão disponíveis em breve.</p>
                </div>
            )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
