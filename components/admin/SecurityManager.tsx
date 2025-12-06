
import React, { useState, useEffect, useCallback } from 'react';
import { getSecuritySettings, updateSecuritySettings, getAllowedDomains, addAllowedDomain, removeAllowedDomain } from '../../services/adminService';
import { SecuritySettings, AllowedDomain } from '../../types';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';

// Helper component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}
function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
    return (
    <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className={`
            relative inline-flex h-8 w-16 rounded-full cursor-pointer
            transition-colors duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
            ${enabled ? 'bg-green-600' : 'bg-gray-300'}
        `}
        onClick={() => onChange(!enabled)}
    >
        <span
            className={`
                absolute left-2 top-1/2 -translate-y-1/2
                text-[10px] font-bold uppercase
                transition-opacity duration-200 ease-in-out
                ${enabled ? 'opacity-100 text-white' : 'opacity-0 text-white'}
            `}
        >
            ON
        </span>
        <span
            className={`
                absolute right-2 top-1/2 -translate-y-1/2
                text-[10px] font-bold uppercase
                transition-opacity duration-200 ease-in-out
                ${enabled ? 'opacity-0 text-gray-700' : 'opacity-100 text-gray-700'}
            `}
        >
            OFF
        </span>
        <span
            aria-hidden="true"
            className={`
                pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md
                transform ring-0 transition-transform duration-300 ease-in-out
                ${enabled ? 'translate-x-8' : 'translate-x-1'}
            `}
        />
    </button>
);
}

export function SecurityManager() {
  const { user: adminUser } = useUser();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const securitySettings = await getSecuritySettings();
      setSettings(securitySettings);
      const domains = await getAllowedDomains();
      setAllowedDomains(domains);
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao carregar configurações de segurança.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingsChange = (field: keyof SecuritySettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSaveSettings = async () => {
    if (!adminUser || !settings) return;
    setSaving(true);
    try {
      await updateSecuritySettings(settings, adminUser.id);
      setToast({ message: 'Configurações de segurança salvas!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao salvar configurações.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !newDomain.trim()) return;
    setSaving(true);
    try {
      await addAllowedDomain(newDomain, adminUser.id);
      setNewDomain('');
      await fetchSettings(); // Refresh list
      setToast({ message: 'Domínio adicionado com sucesso!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao adicionar domínio.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async (id: string, domain: string) => {
    if (!adminUser || !window.confirm(`Tem certeza que deseja remover ${domain}?`)) return;
    setSaving(true);
    try {
      await removeAllowedDomain(id, domain, adminUser.id);
      await fetchSettings(); // Refresh list
      setToast({ message: 'Domínio removido!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Falha ao remover domínio.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
        <p className="mt-2 text-gray-500">Carregando configurações de segurança...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
        <strong>Erro:</strong> Não foi possível carregar as configurações de segurança.
      </div>
    );
  }

  const inputClasses = "w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition duration-300";
  const labelClasses = "block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500";
  const sectionTitleClasses = "text-xl font-bold text-[#263238] mb-4 border-b border-gray-200 pb-2";

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#263238]">Gerenciar Segurança</h2>
            <p className="text-sm text-gray-500">Configure o acesso e permissões de registro.</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 font-bold text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
          >
            {saving ? <><i className="fas fa-spinner fa-spin"></i>Salvando...</> : <><i className="fas fa-save"></i>Salvar Configurações</>}
          </button>
        </div>

        <div className="space-y-8">
          {/* Modo de Validação de Domínio */}
          <div>
            <h3 className={sectionTitleClasses}>Validação de Domínio no Cadastro</h3>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
              <div>
                <label htmlFor="validationMode" className={labelClasses}>Modo de Validação</label>
                <select
                  id="validationMode"
                  name="validationMode"
                  value={settings.validationMode}
                  onChange={e => handleSettingsChange('validationMode', e.target.value)}
                  className={inputClasses}
                  disabled={saving}
                >
                  <option value="strict_allowlist">Lista de Permissão Estrita (apenas domínios na lista)</option>
                  <option value="dns_validation">Validação DNS (permite qualquer domínio com DNS válido)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Strict Allowlist:</strong> Apenas e-mails de domínios explicitamente listados abaixo podem se registrar. <br/>
                  <strong>DNS Validation:</strong> Qualquer e-mail pode se registrar, desde que o domínio tenha um registro DNS válido (previne e-mails falsos/temporários).
                </p>
              </div>
            </div>
          </div>

          {/* Domínios Permitidos (Allowlist) */}
          <div>
            <h3 className={sectionTitleClasses}>Domínios Permitidos (Allowlist)</h3>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
              <form onSubmit={handleAddDomain} className="flex gap-4">
                <input
                  type="text"
                  placeholder="novo-dominio.com"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  className={inputClasses}
                  required
                  disabled={saving}
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i> Adicionar
                </button>
              </form>

              <div className="mt-4 max-h-60 overflow-y-auto custom-scrollbar">
                {allowedDomains.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum domínio na allowlist.</p>
                ) : (
                  <div className="space-y-2">
                    {allowedDomains.map(domain => (
                      <div key={domain.id} className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                        <span className="font-mono text-sm text-gray-700">{domain.domain}</span>
                        <button
                          onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                          disabled={saving}
                          className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
