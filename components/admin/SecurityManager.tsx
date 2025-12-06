
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

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-8 pb-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#263238] mb-2">Segurança & Acesso</h2>
            <p className="text-sm text-gray-500 mb-6">
              Gerencie como os usuários podem se cadastrar na plataforma.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">Modo de Validação de Domínio</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <button
                        onClick={() => handleValidationModeChange('strict_allowlist')}
                        disabled={savingConfig}
                        className={`p-5 rounded-lg border text-left transition-all relative ${
                            settings.validationMode === 'strict_allowlist' 
                            ? 'bg-green-50 border-green-500 text-green-800 shadow-sm ring-1 ring-green-500/20' 
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                    >
                        {settings.validationMode === 'strict_allowlist' && <div className="absolute top-3 right-3 text-green-600"><i className="fas fa-check-circle"></i></div>}
                        <div className="font-bold mb-2 flex items-center text-sm"><i className="fas fa-list-alt mr-2"></i>Lista Estrita (Allowlist)</div>
                        <div className="text-xs leading-relaxed opacity-90">Apenas e-mails cujos domínios estejam explicitamente listados abaixo podem se cadastrar. Todos os outros são bloqueados.</div>
                    </button>

                    <button
                        onClick={() => handleValidationModeChange('dns_validation')}
                        disabled={savingConfig}
                        className={`p-5 rounded-lg border text-left transition-all relative ${
                            settings.validationMode === 'dns_validation' 
                            ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-1 ring-blue-500/20' 
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                    >
                        {settings.validationMode === 'dns_validation' && <div className="absolute top-3 right-3 text-blue-600"><i className="fas fa-check-circle"></i></div>}
                        <div className="font-bold mb-2 flex items-center text-sm"><i className="fas fa-globe mr-2"></i>Validação Automática (DNS)</div>
                        <div className="text-xs leading-relaxed opacity-90">Qualquer domínio real e ativo (com registros MX verificados) pode se cadastrar. A lista abaixo serve como "VIP/Garantido".</div>
                    </button>
                </div>
            </div>
        </div>

        {/* List Header */}
        <h3 className="text-lg font-bold text-[#263238] mb-4 flex items-center">
            <i className="fas fa-shield-alt mr-2 text-green-600"></i> Domínios Permitidos (Allowlist)
        </h3>

        {/* Quick Add Section */}
        {suggestions.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i className="fas fa-magic mr-2 text-green-600"></i> Adição Rápida (Provedores Comuns)
                </h3>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map(domain => (
                        <button
                            key={domain}
                            onClick={() => handleQuickAdd(domain)}
                            disabled={adding}
                            className="px-3 py-1.5 rounded-full bg-white hover:bg-green-50 border border-gray-300 hover:border-green-300 text-sm text-gray-600 hover:text-green-700 transition flex items-center disabled:opacity-50 shadow-sm"
                        >
                            <i className="fas fa-plus mr-2 text-xs"></i>
                            {domain}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Manual Add Form */}
        <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8 flex gap-4 items-end shadow-inner">
          <div className="flex-grow">
            <label htmlFor="newDomain" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
              Adicionar Domínio Personalizado
            </label>
            <input
              id="newDomain"
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: minhaempresa.com.br"
              className="w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2.5 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {adding ? <><i className="fas fa-spinner fa-spin"></i> Adicionando...</> : <><i className="fas fa-plus"></i> Adicionar</>}
          </button>
        </form>

        {/* Domains List */}
        {loading ? (
            <div className="text-center py-12 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando domínios...</div>
        ) : domains.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500">
                Nenhum domínio permitido configurado.
            </div>
        ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Domínio</th>
                            <th className="px-6 py-3 font-semibold">Adicionado Em</th>
                            <th className="px-6 py-3 text-right font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {domains.map(domain => (
                            <tr key={domain.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-[#263238] font-bold">{domain.domain}</td>
                                <td className="px-6 py-4 text-gray-500">{new Date(domain.created_at).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleRemove(domain.id, domain.domain)} className="font-medium text-red-600 hover:text-red-800 hover:underline">Remover</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}
