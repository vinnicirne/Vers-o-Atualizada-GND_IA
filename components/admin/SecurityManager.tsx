
import React, { useState, useEffect, useCallback } from 'react';
import { AllowedDomain, SecuritySettings } from '../../types';
import { getAllowedDomains, addAllowedDomain, removeAllowedDomain, getSecuritySettings, updateSecuritySettings } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';

const COMMON_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'yahoo.com.br',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'icloud.com',
  'protonmail.com'
];

export function SecurityManager() {
  const { user: adminUser } = useUser();
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [settings, setSettings] = useState<SecuritySettings>({ validationMode: 'strict_allowlist' });
  
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [domainsData, settingsData] = await Promise.all([
          getAllowedDomains(),
          getSecuritySettings()
      ]);
      setDomains(domainsData);
      setSettings(settingsData);
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao carregar dados de segurança.", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleValidationModeChange = async (mode: 'strict_allowlist' | 'dns_validation') => {
      if (!adminUser) return;
      setSavingConfig(true);
      try {
          const newSettings: SecuritySettings = { ...settings, validationMode: mode };
          await updateSecuritySettings(newSettings, adminUser.id);
          setSettings(newSettings);
          setToast({ message: "Modo de segurança atualizado com sucesso!", type: 'success' });
      } catch (err: any) {
          setToast({ message: "Erro ao atualizar configuração.", type: 'error' });
      } finally {
          setSavingConfig(false);
      }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !adminUser) return;

    setAdding(true);
    try {
      await addAllowedDomain(newDomain.trim(), adminUser.id);
      setToast({ message: "Domínio adicionado com sucesso!", type: 'success' });
      setNewDomain('');
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao adicionar domínio.", type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleQuickAdd = async (domain: string) => {
      if (!adminUser) return;
      setAdding(true);
      try {
        await addAllowedDomain(domain, adminUser.id);
        setToast({ message: `${domain} liberado com sucesso!`, type: 'success' });
        fetchAll();
      } catch (err: any) {
        setToast({ message: err.message || `Erro ao adicionar ${domain}.`, type: 'error' });
      } finally {
        setAdding(false);
      }
  };

  const handleRemove = async (id: string, domain: string) => {
    if (!adminUser) return;
    if (!window.confirm(`Tem certeza que deseja remover ${domain} da lista de permitidos?`)) return;

    try {
      await removeAllowedDomain(id, domain, adminUser.id);
      setToast({ message: "Domínio removido com sucesso.", type: 'success' });
      fetchAll();
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao remover domínio.", type: 'error' });
    }
  };

  const suggestions = COMMON_DOMAINS.filter(d => !domains.some(existing => existing.domain === d));

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="mb-8 pb-6 border-b border-green-900/20">
            <h2 className="text-2xl font-bold text-green-400 mb-2">Segurança & Acesso</h2>
            <p className="text-sm text-gray-400 mb-6">
              Gerencie como os usuários podem se cadastrar na plataforma.
            </p>

            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Modo de Validação de Domínio</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <button
                        onClick={() => handleValidationModeChange('strict_allowlist')}
                        disabled={savingConfig}
                        className={`p-4 rounded-lg border text-left transition-all relative ${
                            settings.validationMode === 'strict_allowlist' 
                            ? 'bg-green-900/20 border-green-500 text-green-300' 
                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                        {settings.validationMode === 'strict_allowlist' && <div className="absolute top-2 right-2 text-green-500"><i className="fas fa-check-circle"></i></div>}
                        <div className="font-bold mb-1"><i className="fas fa-list-alt mr-2"></i>Lista Estrita (Allowlist)</div>
                        <div className="text-xs opacity-80">Apenas e-mails cujos domínios estejam explicitamente listados abaixo podem se cadastrar. Todos os outros são bloqueados.</div>
                    </button>

                    <button
                        onClick={() => handleValidationModeChange('dns_validation')}
                        disabled={savingConfig}
                        className={`p-4 rounded-lg border text-left transition-all relative ${
                            settings.validationMode === 'dns_validation' 
                            ? 'bg-blue-900/20 border-blue-500 text-blue-300' 
                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                        {settings.validationMode === 'dns_validation' && <div className="absolute top-2 right-2 text-blue-500"><i className="fas fa-check-circle"></i></div>}
                        <div className="font-bold mb-1"><i className="fas fa-globe mr-2"></i>Validação Automática (DNS)</div>
                        <div className="text-xs opacity-80">Qualquer domínio real e ativo (com registros MX verificados online) pode se cadastrar. A lista abaixo serve como "VIP/Garantido".</div>
                    </button>
                </div>
            </div>
        </div>

        {/* List Header */}
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <i className="fas fa-shield-alt mr-2 text-green-500"></i> Domínios Permitidos (Allowlist)
        </h3>

        {/* Quick Add Section */}
        {suggestions.length > 0 && (
            <div className="mb-6 p-4 bg-gray-950/30 rounded-lg border border-green-900/10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                    <i className="fas fa-magic mr-2 text-green-500"></i> Adição Rápida (Provedores Comuns)
                </h3>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map(domain => (
                        <button
                            key={domain}
                            onClick={() => handleQuickAdd(domain)}
                            disabled={adding}
                            className="px-3 py-1.5 rounded-full bg-gray-800 hover:bg-green-900/40 border border-gray-700 hover:border-green-500/50 text-sm text-gray-300 hover:text-green-400 transition flex items-center disabled:opacity-50"
                        >
                            <i className="fas fa-plus mr-2 text-xs"></i>
                            {domain}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Manual Add Form */}
        <form onSubmit={handleAdd} className="bg-gray-950/50 p-4 rounded-lg border border-green-900/20 mb-8 flex gap-4 items-end">
          <div className="flex-grow">
            <label htmlFor="newDomain" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
              Adicionar Domínio Personalizado
            </label>
            <input
              id="newDomain"
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: minhaempresa.com.br"
              className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newDomain.trim()}
            className="px-6 py-3 font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {adding ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-plus mr-2"></i> Adicionar</>}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando lista...</div>
        ) : domains.length === 0 ? (
          <div className="text-center py-8 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400">
            <i className="fas fa-list mr-2"></i>
            A lista está vazia. 
            {settings.validationMode === 'strict_allowlist' 
                ? <span className="text-red-400 block mt-1 font-bold">ATENÇÃO: Em modo estrito, ninguém conseguirá se cadastrar!</span> 
                : <span className="block mt-1">Em modo DNS, isso significa que qualquer domínio válido pode entrar.</span>
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((item) => (
              <div key={item.id} className="bg-gray-900/80 border border-green-900/30 p-4 rounded-lg flex justify-between items-center group hover:border-green-500/50 transition">
                <div className="flex items-center gap-3">
                  <div className="bg-green-900/20 p-2 rounded-full text-green-400">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <span className="font-mono text-gray-200 text-sm">@{item.domain}</span>
                </div>
                <button
                  onClick={() => handleRemove(item.id, item.domain)}
                  className="text-gray-600 hover:text-red-500 transition p-2"
                  title="Remover permissão"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
