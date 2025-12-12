

import React, { useState, useEffect, useCallback } from 'react';
import { getPaymentSettings, saveGatewaySettings, saveCreditPackages } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { PaymentSettings, CreditPackage, GatewayConfig } from '../../types';
import { Toast } from './Toast';
import { v4 as uuidv4 } from 'uuid';

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
};

export function PaymentsConfig() {
    const { user: adminUser } = useUser();
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPaymentSettings();
            setSettings(data);
        } catch (error: any) {
            setToast({ message: error.message || 'Falha ao carregar configurações.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleGatewayChange = (gateway: 'stripe' | 'mercadoPago' | 'asaas', field: keyof GatewayConfig, value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                gateways: {
                    ...prev.gateways,
                    [gateway]: { ...prev.gateways[gateway], [field]: value },
                },
            };
        });
    };

    const handlePackageChange = (index: number, field: keyof CreditPackage, value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            const newPackages = [...prev.packages];
            // Ensure numeric values are stored as numbers
            const numericValue = ['quantidade', 'preco'].includes(field) ? parseFloat(value) || 0 : value;
            (newPackages[index] as any)[field] = numericValue;
            return { ...prev, packages: newPackages };
        });
    };

    const addPackage = () => {
        setSettings(prev => {
            if (!prev) return null;
            const newPackage: CreditPackage = {
                id: uuidv4(), // Generate a new UUID for the new package
                nome: 'Novo Pacote',
                quantidade: 100,
                preco: 10.00,
                ativo: false,
            };
            return { ...prev, packages: [...prev.packages, newPackage] };
        });
    };

    const removePackage = (index: number) => {
        setSettings(prev => {
            if (!prev) return null;
            const newPackages = prev.packages.filter((_, i) => i !== index);
            return { ...prev, packages: newPackages };
        });
    };
    
    const handleSave = async () => {
        if (!settings || !adminUser) {
            setToast({ message: 'Dados de configuração ou sessão de admin inválidos.', type: 'error' });
            return;
        }

        // Validation
        for (const [key, gw] of Object.entries(settings.gateways)) {
            const gatewayConfig = gw as GatewayConfig;
            if (gatewayConfig.enabled && !gatewayConfig.publicKey) {
                setToast({ message: `Gateway ${key} ativo deve ter a chave API (Public Key) preenchida.`, type: 'error' });
                return;
            }
        }
        for (const pkg of settings.packages) {
            const isFreePackage = ['grátis', 'free'].includes(pkg.nome.trim().toLowerCase());
            const isInvalidPrice = pkg.preco < 0 || (pkg.preco === 0 && !isFreePackage);

            if (!pkg.nome.trim() || pkg.quantidade <= 0 || isInvalidPrice) {
                setToast({ 
                    message: 'Pacotes devem ter nome, créditos > 0 e preço válido. Preço zero é permitido apenas para pacotes "Grátis" ou "Free".', 
                    type: 'error' 
                });
                return;
            }
        }
        
        setSaving(true);
        try {
            await Promise.all([
                saveGatewaySettings(settings.gateways, adminUser.id),
                saveCreditPackages(settings.packages, adminUser.id),
            ]);
            setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
        } catch (error: any) {
            setToast({ message: error.message || 'Falha ao salvar configurações.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-600"></i></div>;
    if (!settings) return <div className="text-center p-8 text-red-500">Não foi possível carregar as configurações.</div>;

    const renderGatewayConfig = (name: 'stripe' | 'mercadoPago' | 'asaas', title: string, icon: string, placeholderKey: string = 'Public Key / API Key') => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 transition hover:border-gray-300">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <i className={`${icon} text-2xl text-gray-600`}></i>
                    <h3 className="text-xl font-bold text-[#263238]">{title}</h3>
                </div>
                <ToggleSwitch enabled={settings.gateways[name]?.enabled ?? false} onChange={(e) => handleGatewayChange(name, 'enabled', e)} />
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">{placeholderKey}</label>
                    <input type="text" value={settings.gateways[name]?.publicKey ?? ''} onChange={(e) => handleGatewayChange(name, 'publicKey', e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-700 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" />
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    <i className="fas fa-lock mr-2"></i>
                    Chaves Secretas (Secret Keys) não são mais gerenciadas aqui. Configure as variáveis de ambiente <code>MP_ACCESS_TOKEN</code> e <code>ASAAS_KEY</code> no painel do Supabase (Edge Functions) para segurança.
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderGatewayConfig('stripe', 'Stripe', 'fab fa-stripe-s')}
                {renderGatewayConfig('mercadoPago', 'Mercado Pago', 'fas fa-hand-holding-usd', 'Access Token (Público)')}
                {renderGatewayConfig('asaas', 'Asaas', 'fas fa-money-bill-wave', 'API Key (Pública)')}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#263238] mb-6 border-b border-gray-100 pb-3">Pacotes de Créditos</h3>
                <div className="space-y-4">
                    {settings.packages.map((pkg, index) => (
                        <div key={pkg.id} className="grid grid-cols-1 md:grid-cols-10 gap-3 items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                            <div className="md:col-span-4">
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Nome do Pacote</label>
                                <input type="text" value={pkg.nome} onChange={(e) => handlePackageChange(index, 'nome', e.target.value)} className="w-full bg-white border border-gray-300 text-gray-700 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500"/>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Créditos</label>
                                <input type="number" value={pkg.quantidade} onChange={(e) => handlePackageChange(index, 'quantidade', e.target.value)} className="w-full bg-white border border-gray-300 text-gray-700 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500"/>
                            </div>
                             <div className="md:col-span-2">
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Preço (R$)</label>
                                <input type="number" step="0.01" value={pkg.preco} onChange={(e) => handlePackageChange(index, 'preco', e.target.value)} className="w-full bg-white border border-gray-300 text-gray-700 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500"/>
                            </div>
                            <div className="md:col-span-1 text-center">
                                 <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Ativo</label>
                                <ToggleSwitch enabled={pkg.ativo} onChange={(e) => handlePackageChange(index, 'ativo', e)} />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                                <button onClick={() => removePackage(index)} className="mt-5 text-red-500 hover:text-red-700 transition-colors h-9 w-9 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md shadow-sm">
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                 <button onClick={addPackage} className="mt-6 px-4 py-2 text-sm font-bold text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition border border-green-200 flex items-center gap-2">
                    <i className="fas fa-plus"></i> Adicionar Pacote
                </button>
            </div>
            
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Salvando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-save"></i>
                            Salvar Configurações
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};