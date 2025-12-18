
import React, { useState, useEffect, useCallback } from 'react';
import { getMultiAISettings, updateMultiAISettings, getAILogs } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { MultiAISettings, AIPlatform, AIModel, AILog } from '../../types';
import { Toast } from './Toast';
import { Pagination } from './Pagination';

type ActiveTab = 'platforms' | 'models' | 'usage';

// Helper component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}
function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
    return (
    <button
        type="button"
        className={`${enabled ? 'bg-green-600' : 'bg-gray-300'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
        onClick={() => onChange(!enabled)}
    >
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform shadow-sm`} />
    </button>
);
}

export function MultiIASystem() {
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
        /* Fixed: Cast field to string for .includes() compatibility */
        const numericValue = ['costPerMillionTokens', 'maxTokens'].includes(field as string) ? parseFloat(value) || 0 : value;
        return {
            ...prev,
            platforms: {
                ...prev.platforms,
                /* Fixed: Cast index signatures to string to satisfy TypeScript indexing rules */
                [platform as string]: { ...prev.platforms[platform], [field as string]: numericValue },
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
        ? 'bg-white border-t border-l border-r border-gray-200 text-green-600 -mb-px'
        : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 border-b border-gray-200'
    }`;
    
  const renderPlatformConfig = () => {
    if (loadingSettings) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>;
    if (!settings) return <div className="text-center p-8 text-red-500">Não foi possível carregar as configurações.</div>;

    const platforms: { key: keyof MultiAISettings['platforms']; name: string; icon: string }[] = [
        { key: 'gemini', name: 'Google Gemini', icon: 'fas fa-gem' },
        { key: 'openai', name: 'OpenAI', icon: 'fas fa-bolt' },
        { key: 'claude', name: 'Anthropic Claude', icon: 'fas fa-feather-alt' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200">
            {platforms.map(({ key, name, icon }) => (
                 /* Fixed: Cast key to string for list mapping */
                 <div key={key as string} className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm transition hover:border-gray-300">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-green-600">
                                <i className={`${icon} text-lg`}></i>
                            </div>
                            <h3 className="text-lg font-bold text-[#263238]">{name}</h3>
                        </div>
                        <ToggleSwitch enabled={settings.platforms[key].enabled} onChange={(e) => handlePlatformChange(key, 'enabled', e)} />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Chave de API</label>
                            <div className="relative">
                                <input 
                                    /* Fixed: Cast index to string */
                                    type={visibleKeys[key as string] ? 'text' : 'password'} 
                                    value={settings.platforms[key].apiKey} 
                                    onChange={(e) => handlePlatformChange(key, 'apiKey', e.target.value)} 
                                    className="w-full bg-white border border-gray-300 rounded p-2 text-sm pr-10 text-gray-700 focus:ring-green-500 focus:border-green-500" />
                                /* Fixed: Cast index to string for visibility toggle */
                                <button onClick={() => setVisibleKeys(p => ({ ...p, [key as string]: !p[key as string]}))} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                                    <i className={`fas ${visibleKeys[key as string] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>
                         <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Custo / Milhão de Tokens ($)</label>
                            <input type="number" step="0.01" value={settings.platforms[key].costPerMillionTokens} onChange={(e) => handlePlatformChange(key, 'costPerMillionTokens', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-green-500 focus:border-green-500" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Max Tokens / Chamada</label>
                            <input type="number" value={settings.platforms[key].maxTokens} onChange={(e) => handlePlatformChange(key, 'maxTokens', e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-green-500 focus:border-green-500" />
                        </div>
                    </div>
                 </div>
            ))}
        </div>
    );
  };
  
  const renderModelsConfig = () => {
    if (loadingSettings) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>;
    if (!settings) return <div className="text-center p-8 text-red-500">Não foi possível carregar as configurações.</div>;

    return (
        <div className="bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-[#263238] mb-6 border-b border-gray-100 pb-3">Modelos de IA Disponíveis</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Nome do Modelo</th>
                            <th className="px-4 py-3 font-semibold">Plataforma</th>
                            <th className="px-4 py-3 font-semibold">Contexto</th>
                            <th className="px-4 py-3 font-semibold">Capacidades</th>
                            <th className="px-4 py-3 text-center font-semibold">Status</th>
                            <th className="px-4 py-3 text-right font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {settings.models.map((model, index) => (
                            <tr key={model.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2"><input type="text" value={model.nome} onChange={e => handleModelChange(index, 'nome', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-sm text-gray-700 focus:ring-green-500 focus:border-green-500"/></td>
                                <td className="px-4 py-2">
                                    <select value={model.plataforma} onChange={e => handleModelChange(index, 'plataforma', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-sm text-gray-700 focus:ring-green-500 focus:border-green-500">
                                        <option value="gemini">Gemini</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="claude">Claude</option>
                                    </select>
                               </td>
                                <td className="px-4 py-2"><input type="number" value={model.contexto_maximo} onChange={e => handleModelChange(index, 'contexto_maximo', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-sm text-gray-700 focus:ring-green-500 focus:border-green-500"/></td>
                                <td className="px-4 py-2 space-x-4">
                                    <label className="inline-flex items-center text-xs font-medium text-gray-600"><input type="checkbox" checked={model.capacidades?.vision ?? false} onChange={e => handleModelChange(index, 'capacidades', { vision: e.target.checked })} className="form-checkbox bg-white border-gray-300 rounded text-green-600 mr-1.5 focus:ring-green-500" /> Visão</label>
                                    <label className="inline-flex items-center text-xs font-medium text-gray-600"><input type="checkbox" checked={model.capacidades?.audio ?? false} onChange={e => handleModelChange(index, 'capacidades', { audio: e.target.checked })} className="form-checkbox bg-white border-gray-300 rounded text-green-600 mr-1.5 focus:ring-green-500" /> Áudio</label>
                                </td>
                                <td className="px-4 py-2 text-center"><ToggleSwitch enabled={model.ativo} onChange={e => handleModelChange(index, 'ativo', e)} /></td>
                                <td className="px-4 py-2 text-right"><button onClick={() => removeModel(index)} className="text-red-500 hover:text-red-700 transition-colors p-2 rounded hover:bg-red-50"><i className="fas fa-trash"></i></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={addModel} className="mt-6 px-4 py-2 text-sm font-bold text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition border border-green-200 flex items-center gap-2"><i className="fas fa-plus"></i> Adicionar Modelo</button>
        </div>
    );
  };
  
  const renderUsageAndCosts = () => {
    const totalTokens = logs.reduce((sum, log) => sum + log.tokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + log.custo, 0);

    return (
        <div className="space-y-6 bg-white p-6 rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center space-x-4">
                    <div className="bg-blue-100 p-4 rounded-full text-blue-600"><i className="fas fa-brain text-2xl"></i></div>
                    <div><p className="text-sm text-gray-500 font-medium">Total de Tokens (Paginado)</p><p className="text-3xl font-bold text-[#263238]">{totalTokens.toLocaleString('pt-BR')}</p></div>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center space-x-4">
                    <div className="bg-green-100 p-4 rounded-full text-green-600"><i className="fas fa-dollar-sign text-2xl"></i></div>
                    <div><p className="text-sm text-gray-500 font-medium">Custo Estimado (Paginado)</p><p className="text-3xl font-bold text-[#263238]">{totalCost.toLocaleString('pt-BR', {style: 'currency', currency: 'USD'})}</p></div>
                </div>
            </div>
            <div className="mt-8">
                <h3 className="text-xl font-bold text-[#263238] mb-6 border-b border-gray-100 pb-3">Logs de Uso de IA</h3>
                {loadingLogs ? <div className="text-center p-8 text-gray-500"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div> : (
                    logs.length > 0 ? (
                        <>
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Usuário</th><th className="px-4 py-3 font-semibold">Modelo</th><th className="px-4 py-3 text-right font-semibold">Tokens</th><th className="px-4 py-3 text-right font-semibold">Custo</th><th className="px-4 py-3 font-semibold">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-2">{log.user?.email || 'N/A'}</td><td className="px-4 py-2 font-mono text-xs text-gray-500 bg-gray-50 px-2 rounded w-fit">{log.modelo_id}</td><td className="px-4 py-2 text-right font-mono">{log.tokens.toLocaleString('pt-BR')}</td><td className="px-4 py-2 text-right font-mono text-green-600 font-bold">{log.custo.toLocaleString('pt-BR', {style: 'currency', currency: 'USD', minimumFractionDigits: 4})}</td><td className="px-4 py-2 text-gray-500">{new Date(log.data).toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={currentPage} totalPages={totalLogPages} onPageChange={setCurrentPage} />
                        </>
                    ) : <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">Nenhum log de uso encontrado.</div>
                )}
            </div>
        </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col">
        <nav className="flex" aria-label="Tabs">
          <button onClick={() => setActiveTab('platforms')} className={tabClasses('platforms')}><i className="fas fa-server mr-2"></i>Plataformas</button>
          <button onClick={() => setActiveTab('models')} className={tabClasses('models')}><i className="fas fa-cogs mr-2"></i>Modelos</button>
          <button onClick={() => setActiveTab('usage')} className={tabClasses('usage')}><i className="fas fa-chart-line mr-2"></i>Uso & Custos</button>
          
          {/* Spacer to fill remaining border */}
          <div className="flex-grow border-b border-gray-200"></div>
        </nav>
      </div>

      <div className="relative">
        {activeTab !== 'usage' && (
             <div className="absolute top-[-50px] right-0">
                <button
                    onClick={handleSave}
                    disabled={saving || loadingSettings}
                    className="px-4 py-2 font-bold text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                >
                    {saving ? <><i className="fas fa-spinner fa-spin"></i>Salvando...</> : <><i className="fas fa-save"></i>Salvar Tudo</>}
                </button>
            </div>
        )}

        {activeTab === 'platforms' && renderPlatformConfig()}
        {activeTab === 'models' && renderModelsConfig()}
        {activeTab === 'usage' && renderUsageAndCosts()}
      </div>
    </div>
  );
};
