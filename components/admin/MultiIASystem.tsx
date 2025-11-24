import React, { useState, useEffect, useCallback } from 'react';
import { getMultiAISettings, updateMultiAISettings, getAILogs } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { MultiAISettings, AIPlatform, AIModel, AILog } from '../../types';
import { Toast } from './Toast';
import { Pagination } from './Pagination';

type ActiveTab = 'platforms' | 'models' | 'usage';

// Helper component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button
        type="button"
        className={`${enabled ? 'bg-green-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-green-500`}
        onClick={() => onChange(!enabled)}
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
    </button>
);

export const MultiIASystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('platforms');
  const { user: adminUser } = useUser();
  
  // Settings state
  const [settings, setSettings] = useState<MultiAISettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Logs state
  const [logs, setLogs] = useState<AILog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 15;
  const totalLogPages = Math.ceil(totalLogs / LOGS_PER_PAGE);

  // UI state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: boolean }>({});

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await getMultiAISettings();
      setSettings(data);
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao carregar configurações de IA.', type: 'error' });
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
        const { logs: fetchedLogs, count } = await getAILogs({ page: currentPage, limit: LOGS_PER_PAGE });
        setLogs(fetchedLogs);
        setTotalLogs(count);
    } catch (error: any) {
        setToast({ message: error.message || 'Falha ao carregar logs de uso da IA.', type: 'error' });
    } finally {
        setLoadingLogs(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (activeTab === 'usage') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);
  
  const handlePlatformChange = (platform: keyof MultiAISettings['platforms'], field: keyof AIPlatform, value: any) => {
    setSettings(prev => {
        if (!prev) return null;
        const numericValue = ['costPerMillionTokens', 'maxTokens'].includes(field) ? parseFloat(value) || 0 : value;
        return {
            ...prev,
            platforms: {
                ...prev.platforms,
                [platform]: { ...prev.platforms[platform], [field]: numericValue },
            },
        };
    });
  };
  
  const handleModelChange = (index: number, field: keyof AIModel, value: any) => {
    setSettings(prev => {
        if (!prev) return null;
        const newModels = [...prev.models];
        let finalValue = value;
        if (field === 'contexto_maximo') finalValue = parseInt(value, 10) || 0;
        if (field === 'capacidades') finalValue = { ...(newModels[index].capacidades || {}), ...value };
        
        (newModels[index] as any)[field] = finalValue;
        return { ...prev, models: newModels };
    });
  };

  const addModel = () => {
    setSettings(prev => {
        if (!prev) return null;
        const newModel: AIModel = {
            id: `new-model-${Date.now()}`,
            nome: 'Novo Modelo',
            plataforma: 'gemini',
            contexto_maximo: 8192,
            capacidades: { vision: false, audio: false },
            ativo: false,
            custo_token: 0.50
        };
        return { ...prev, models: [...prev.models, newModel] };
    });
  };
  
  const removeModel = (index: number) => {
    setSettings(prev => {
        if (!prev) return null;
        return { ...prev, models: prev.models.filter((_, i) => i !== index) };
    });
  };

  const handleSave = async () => {
    if (!settings || !adminUser) {
        setToast({ message: 'Dados de configuração ou sessão de admin inválidos.', type: 'error' });
        return;
    }
    // Simple Validation
    for (const [key, platform] of Object.entries(settings.platforms)) {
        const platformConfig = platform as AIPlatform;
        if(platformConfig.enabled && !platformConfig.apiKey) {
            setToast({ message: `A plataforma ${key} está ativa mas não possui uma Chave de API.`, type: 'error' });
            return;
        }
    }
    setSaving(true);
    try {
        await updateMultiAISettings(settings, adminUser.id);
        setToast({ message: 'Configurações de IA salvas com sucesso!', type: 'success' });
    } catch (error: any) {
        setToast({ message: error.message || 'Falha ao salvar configurações de IA.', type: 'error' });
    } finally {
        setSaving(false);
    }
  };

  const tabClasses = (tabName: ActiveTab) =>
    `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors duration-200 focus:outline-none ${
      activeTab === tabName
        ? 'bg-black/30 border-b-2 border-green-500 text-green-400'
        : 'text-gray-500 hover:text-gray-300'
    }`;
    
  const renderPlatformConfig = () => {
    if (loadingSettings) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-400"></i></div>;
    if (!settings) return <div className="text-center p-8 text-red-400">Não foi possível carregar as configurações.</div>;

    const platforms: { key: keyof MultiAISettings['platforms']; name: string; icon: string }[] = [
        { key: 'gemini', name: 'Google Gemini', icon: 'fas fa-gem' },
        { key: 'openai', name: 'OpenAI', icon: 'fas fa-bolt' },
        { key: 'claude', name: 'Anthropic Claude', icon: 'fas fa-feather-alt' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {platforms.map(({ key, name, icon }) => (
                 <div key={key} className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                            <i className={`${icon} text-2xl text-green-400/80`}></i>
                            <h3 className="text-xl font-bold text-green-400">{name}</h3>
                        </div>
                        <ToggleSwitch enabled={settings.platforms[key].enabled} onChange={(e) => handlePlatformChange(key, 'enabled', e)} />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Chave de API</label>
                            <div className="relative">
                                <input 
                                    type={visibleKeys[key] ? 'text' : 'password'} 
                                    value={settings.platforms[key].apiKey} 
                                    onChange={(e) => handlePlatformChange(key, 'apiKey', e.target.value)} 
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm pr-10" />
                                <button onClick={() => setVisibleKeys(p => ({ ...p, [key]: !p[key]}))} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white">
                                    <i className={`fas ${visibleKeys[key] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>
                         <div>
                            <label className="text-xs text-gray-400 block mb-1">Custo / Milhão de Tokens ($)</label>
                            <input type="number" step="0.01" value={settings.platforms[key].costPerMillionTokens} onChange={(e) => handlePlatformChange(key, 'costPerMillionTokens', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Max Tokens / Chamada</label>
                            <input type="number" value={settings.platforms[key].maxTokens} onChange={(e) => handlePlatformChange(key, 'maxTokens', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm" />
                        </div>
                    </div>
                 </div>
            ))}
        </div>
    );
  };
  
  const renderModelsConfig = () => {
    if (loadingSettings) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-400"></i></div>;
    if (!settings) return <div className="text-center p-8 text-red-400">Não foi possível carregar as configurações.</div>;

    return (
        <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
            <h3 className="text-xl font-bold text-green-400 mb-4">Modelos de IA Disponíveis</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-green-300 uppercase bg-black/40">
                        <tr>
                            <th className="px-4 py-3">Nome do Modelo</th>
                            <th className="px-4 py-3">Plataforma</th>
                            <th className="px-4 py-3">Contexto</th>
                            <th className="px-4 py-3">Capacidades</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {settings.models.map((model, index) => (
                            <tr key={model.id} className="bg-gray-950/50 border-b border-green-900/20">
                                <td className="px-4 py-2"><input type="text" value={model.nome} onChange={e => handleModelChange(index, 'nome', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm"/></td>
                                <td className="px-4 py-2">
                                    <select value={model.plataforma} onChange={e => handleModelChange(index, 'plataforma', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm">
                                        <option value="gemini">Gemini</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="claude">Claude</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2"><input type="number" value={model.contexto_maximo} onChange={e => handleModelChange(index, 'contexto_maximo', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm"/></td>
                                <td className="px-4 py-2 space-x-4">
                                    <label className="inline-flex items-center text-xs"><input type="checkbox" checked={model.capacidades?.vision ?? false} onChange={e => handleModelChange(index, 'capacidades', { vision: e.target.checked })} className="form-checkbox bg-gray-800 border-gray-600 rounded text-green-500" /> Visão</label>
                                    <label className="inline-flex items-center text-xs"><input type="checkbox" checked={model.capacidades?.audio ?? false} onChange={e => handleModelChange(index, 'capacidades', { audio: e.target.checked })} className="form-checkbox bg-gray-800 border-gray-600 rounded text-green-500" /> Áudio</label>
                                </td>
                                <td className="px-4 py-2 text-center"><ToggleSwitch enabled={model.ativo} onChange={e => handleModelChange(index, 'ativo', e)} /></td>
                                <td className="px-4 py-2 text-right"><button onClick={() => removeModel(index)} className="text-red-500 hover:text-red-400"><i className="fas fa-trash"></i></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={addModel} className="mt-4 px-4 py-2 text-sm font-bold text-green-300 bg-green-900/30 rounded-lg hover:bg-green-900/60 transition"><i className="fas fa-plus mr-2"></i> Adicionar Modelo</button>
        </div>
    );
  };
  
  const renderUsageAndCosts = () => {
    const totalTokens = logs.reduce((sum, log) => sum + log.tokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + log.custo, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/30 p-6 rounded-lg border border-green-900/30 flex items-center space-x-4"><div className="bg-green-900/20 p-4 rounded-full"><i className="fas fa-brain text-2xl text-green-400"></i></div><div><p className="text-sm text-gray-400">Total de Tokens (Paginado)</p><p className="text-3xl font-bold">{totalTokens.toLocaleString('pt-BR')}</p></div></div>
                <div className="bg-black/30 p-6 rounded-lg border border-green-900/30 flex items-center space-x-4"><div className="bg-green-900/20 p-4 rounded-full"><i className="fas fa-dollar-sign text-2xl text-green-400"></i></div><div><p className="text-sm text-gray-400">Custo Estimado (Paginado)</p><p className="text-3xl font-bold">{totalCost.toLocaleString('pt-BR', {style: 'currency', currency: 'USD'})}</p></div></div>
            </div>
            <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
                <h3 className="text-xl font-bold text-green-400 mb-4">Logs de Uso de IA</h3>
                {loadingLogs ? <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-400"></i></div> : (
                    logs.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-green-300 uppercase bg-black/40">
                                        <tr>
                                            <th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Modelo</th><th className="px-4 py-3 text-right">Tokens</th><th className="px-4 py-3 text-right">Custo</th><th className="px-4 py-3">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id} className="bg-gray-950/50 border-b border-green-900/20">
                                                <td className="px-4 py-2">{log.user?.email || 'N/A'}</td><td className="px-4 py-2 font-mono text-xs">{log.modelo_id}</td><td className="px-4 py-2 text-right">{log.tokens.toLocaleString('pt-BR')}</td><td className="px-4 py-2 text-right">{log.custo.toLocaleString('pt-BR', {style: 'currency', currency: 'USD', minimumFractionDigits: 4})}</td><td className="px-4 py-2">{new Date(log.data).toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={currentPage} totalPages={totalLogPages} onPageChange={setCurrentPage} />
                        </>
                    ) : <div className="text-center py-12 text-gray-500">Nenhum log de uso encontrado.</div>
                )}
            </div>
        </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="border-b border-green-900/30 flex justify-between items-center flex-wrap gap-4">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <button onClick={() => setActiveTab('platforms')} className={tabClasses('platforms')}><i className="fas fa-server mr-2"></i>Plataformas</button>
          <button onClick={() => setActiveTab('models')} className={tabClasses('models')}><i className="fas fa-cogs mr-2"></i>Modelos</button>
          <button onClick={() => setActiveTab('usage')} className={tabClasses('usage')}><i className="fas fa-chart-line mr-2"></i>Uso & Custos</button>
        </nav>
        {activeTab !== 'usage' && (
             <button
                onClick={handleSave}
                disabled={saving || loadingSettings}
                className="px-6 py-2 font-bold text-sm text-black bg-green-600 rounded-lg hover:bg-green-500 transition-all shadow-md shadow-green-600/20 disabled:opacity-50 disabled:cursor-wait"
            >
                {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Salvando...</> : <><i className="fas fa-save mr-2"></i>Salvar Tudo</>}
            </button>
        )}
      </div>

      <div>
        {activeTab === 'platforms' && renderPlatformConfig()}
        {activeTab === 'models' && renderModelsConfig()}
        {activeTab === 'usage' && renderUsageAndCosts()}
      </div>
    </div>
  );
};