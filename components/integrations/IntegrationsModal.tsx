
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header - Light Theme */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
             <div className="bg-green-50 p-2 rounded-full border border-green-100">
                <i className="fas fa-plug text-green-600 text-xl"></i>
             </div>
             <div>
                <h2 className="text-xl font-bold text-[#263238]">Integrações Externas</h2>
                <p className="text-sm text-gray-500">Conecte o GDN_IA aos seus aplicativos favoritos.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#263238] transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4 bg-white">
            <button 
                onClick={() => setActiveTab('external')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'external' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Integrações Externas
            </button>
            <button 
                onClick={() => setActiveTab('advanced')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'advanced' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                IA & Modelos (Avançado)
            </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-[#ECEFF1]">
            {activeTab === 'external' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* WordPress Card */}
                    <div className={`p-6 rounded-xl border bg-white shadow-sm transition-all ${wpConfig.isConnected ? 'border-green-500 ring-1 ring-green-500/20' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <i className="fab fa-wordpress text-4xl text-gray-300"></i>
                                <div>
                                    <h3 className="text-lg font-bold text-[#263238]">WordPress</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Conecte seu site para publicar notícias geradas diretamente com um clique.</p>
                                </div>
                            </div>
                            {wpConfig.isConnected && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded border border-green-200 font-bold">Conectado</span>}
                        </div>

                        {!wpConfig.isConnected ? (
                            <form onSubmit={handleConnectWP} className="space-y-4">
                                {connectionError && (
                                    <div className="bg-red-50 border border-red-100 p-3 rounded text-[10px] text-red-600 mb-2">
                                        <p className="font-bold mb-1"><i className="fas fa-exclamation-circle"></i> Erro de Conexão (CORS)</p>
                                        <p>{connectionError}</p>
                                        <p className="mt-2 text-gray-500">Dica: Instale o plugin <strong>"Application Passwords"</strong> e um plugin de <strong>"Enable CORS"</strong> no seu site WordPress se o problema persistir.</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">URL do Site</label>
                                    <input 
                                        type="text" 
                                        placeholder="https://meusite.com"
                                        value={wpConfig.siteUrl}
                                        onChange={e => setWpConfig({...wpConfig, siteUrl: e.target.value})}
                                        className="w-full bg-[#F5F7FA] border border-gray-300 rounded p-3 text-sm text-[#263238] focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
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
                                        className="w-full bg-[#F5F7FA] border border-gray-300 rounded p-3 text-sm text-[#263238] focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
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
                                        className="w-full bg-[#F5F7FA] border border-gray-300 rounded p-3 text-sm text-[#263238] focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
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
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-900/20"
                                >
                                    {loading ? <><i className="fas fa-spinner fa-spin"></i> Conectando...</> : 'Conectar'}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-100 p-4 rounded text-sm text-gray-600">
                                    <p><strong>URL:</strong> {wpConfig.siteUrl}</p>
                                    <p><strong>Usuário:</strong> {wpConfig.username}</p>
                                </div>
                                <button 
                                    onClick={handleDisconnectWP}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded transition"
                                >
                                    Desconectar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Google Analytics 4 Card */}
                    <div className={`p-6 rounded-xl border bg-white shadow-sm transition-all ${gaConfig.isConnected ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-chart-line text-4xl text-orange-400"></i>
                                <div>
                                    <h3 className="text-lg font-bold text-[#263238]">Google Analytics 4</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Ative o rastreamento para acompanhar a performance deste dashboard.</p>
                                </div>
                            </div>
                            {gaConfig.isConnected && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded border border-orange-200 font-bold">Ativo</span>}
                        </div>
                        
                        {!gaConfig.isConnected ? (
                            <form onSubmit={handleConnectGA} className="space-y-4">
                                <div className="bg-[#F5F7FA] p-4 rounded border border-gray-200">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">ID de Medição (Measurement ID)</label>
                                    <input 
                                        type="text" 
                                        placeholder="G-XXXXXXXXXX"
                                        value={gaConfig.measurementId}
                                        onChange={e => setGaConfig({...gaConfig, measurementId: e.target.value})}
                                        className="w-full bg-white border border-gray-300 text-[#263238] p-2 rounded-md focus:border-orange-500 focus:outline-none font-mono text-sm"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        Encontre em: Admin GA4 → Fluxo de Dados (Data Streams) → ID da Medição.
                                    </p>
                                </div>
                                <button 
                                    type="submit" 
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 rounded transition flex justify-center items-center gap-2 shadow-lg shadow-orange-900/20"
                                >
                                    Ativar Rastreamento
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-orange-50 border border-orange-100 p-4 rounded text-sm text-gray-600">
                                    <p className="font-bold text-orange-600 mb-1">Rastreamento Ativo</p>
                                    <p>ID: <span className="font-mono text-[#263238]">{gaConfig.measurementId}</span></p>
                                    <p className="text-xs text-gray-500 mt-2">O script do GA4 foi injetado na aplicação.</p>
                                </div>
                                <button 
                                    onClick={handleDisconnectGA}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded transition"
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
                    <i className="fas fa-microchip text-4xl mb-4 text-gray-300"></i>
                    <p>Configurações avançadas de modelos de IA estarão disponíveis em breve.</p>
                </div>
            )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
