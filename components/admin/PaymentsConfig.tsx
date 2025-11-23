import React, { useState, useEffect, useCallback } from 'react';
import { getPaymentSettings, saveGatewaySettings, saveCreditPackages } from '../../services/adminService';
import { useUser } from '../../contexts/UserContext';
import { PaymentSettings, CreditPackage, GatewayConfig } from '../../types';
import { Toast } from './Toast';
import { v4 as uuidv4 } from 'uuid';

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => {
    return (
        <button
            type="button"
            className={`${enabled ? 'bg-green-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-green-500`}
            onClick={() => onChange(!enabled)}
        >
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
        </button>
    );
};

export const PaymentsConfig: React.FC = () => {
    const { user: adminUser } = useUser();
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: boolean }>({});

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

    const handleGatewayChange = (gateway: 'stripe' | 'mercadoPago', field: keyof GatewayConfig, value: any) => {
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
            // This is a soft delete for the UI, the save function will need to handle the actual DB operation if needed
            const newPackages = prev.packages.filter((_, i) => i !== index);
            return { ...prev, packages: newPackages };
        });
        // Note: a proper implementation for existing items would require a DELETE call to the DB.
        // For simplicity here, we assume we can just remove it from the list and on save, the full list is upserted.
    };
    
    const handleSave = async () => {
        if (!settings || !adminUser) {
            setToast({ message: 'Dados de configuração ou sessão de admin inválidos.', type: 'error' });
            return;
        }

        // Validation
        for (const gw of Object.values(settings.gateways)) {
            const gatewayConfig = gw as GatewayConfig;
            if (gatewayConfig.enabled && (!gatewayConfig.publicKey || !gatewayConfig.secretKey)) {
                setToast({ message: 'Gateways ativos devem ter as chaves Public e Secret preenchidas.', type: 'error' });
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
    
    if (loading) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-400"></i></div>;
    if (!settings) return <div className="text-center p-8 text-red-400">Não foi possível carregar as configurações.</div>;

    const renderGatewayConfig = (name: 'stripe' | 'mercadoPago', title: string, icon: string) => (
        <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <i className={`${icon} text-2xl`}></i>
                    <h3 className="text-xl font-bold text-green-400">{title}</h3>
                </div>
                <ToggleSwitch enabled={settings.gateways[name].enabled} onChange={(e) => handleGatewayChange(name, 'enabled', e)} />
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Public Key</label>
                    <input type="text" value={settings.gateways[name].publicKey} onChange={(e) => handleGatewayChange(name, 'publicKey', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm" />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">{name === 'stripe' ? 'Secret Key' : 'Access Token'}</label>
                     <div className="relative">
                        <input type={visibleKeys[name] ? 'text' : 'password'} value={settings.gateways[name].secretKey} onChange={(e) => handleGatewayChange(name, 'secretKey', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm pr-10" />
                        <button onClick={() => setVisibleKeys(p => ({ ...p, [name]: !p[name]}))} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white">
                            <i className={`fas ${visibleKeys[name] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderGatewayConfig('stripe', 'Stripe', 'fab fa-stripe-s')}
                {renderGatewayConfig('mercadoPago', 'Mercado Pago', 'fas fa-hand-holding-usd')}
            </div>

            <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
                <h3 className="text-xl font-bold text-green-400 mb-4">Pacotes de Créditos</h3>
                <div className="space-y-4">
                    {settings.packages.map((pkg, index) => (
                        <div key={pkg.id} className="grid grid-cols-1 md:grid-cols-10 gap-3 items-center p-3 bg-gray-950/50 rounded-md border border-green-900/10">
                            <div className="md:col-span-4">
                                <label className="text-xs text-gray-400 block mb-1">Nome do Pacote</label>
                                <input type="text" value={pkg.nome} onChange={(e) => handlePackageChange(index, 'nome', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm"/>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-400 block mb-1">Créditos</label>
                                <input type="number" value={pkg.quantidade} onChange={(e) => handlePackageChange(index, 'quantidade', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm"/>
                            </div>
                             <div className="md:col-span-2">
                                <label className="text-xs text-gray-400 block mb-1">Preço (R$)</label>
                                <input type="number" step="0.01" value={pkg.preco} onChange={(e) => handlePackageChange(index, 'preco', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm"/>
                            </div>
                            <div className="md:col-span-1 text-center">
                                 <label className="text-xs text-gray-400 block mb-1">Ativo</label>
                                <ToggleSwitch enabled={pkg.ativo} onChange={(e) => handlePackageChange(index, 'ativo', e)} />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                                <button onClick={() => removePackage(index)} className="mt-5 text-red-500 hover:text-red-400 transition-colors h-9 w-9 bg-red-900/20 rounded-md">
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                 <button onClick={addPackage} className="mt-4 px-4 py-2 text-sm font-bold text-green-300 bg-green-900/30 rounded-lg hover:bg-green-900/60 transition">
                    <i className="fas fa-plus mr-2"></i> Adicionar Pacote
                </button>
            </div>
            
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-wait"
                >
                    {saving ? (
                        <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Salvando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-save mr-2"></i>
                            Salvar Configurações
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};