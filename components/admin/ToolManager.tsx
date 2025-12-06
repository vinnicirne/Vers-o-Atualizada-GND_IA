
import React, { useState, useEffect, useCallback } from 'react';
import { CREATOR_SUITE_MODES, SERVICE_ICONS, SERVICE_COLORS } from '../../constants'; // Importamos SERVICE_ICONS e SERVICE_COLORS
import { getGlobalToolSettings, updateGlobalToolSettings } from '../../services/adminService';
import { ServiceKey, ToolSetting } from '../../types';
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
        className={`${enabled ? 'bg-green-600' : 'bg-gray-300'} relative inline-flex items-center h-7 rounded-full w-14 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
        onClick={() => onChange(!enabled)}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-7' : 'translate-x-1'} 
                        inline-block w-6 h-6 transform bg-white rounded-full transition-transform shadow-md`}
        />
        <span className={`absolute left-2 text-[10px] font-bold text-white transition-opacity ${enabled ? 'opacity-0' : 'opacity-100'}`}>OFF</span>
        <span className={`absolute right-2 text-[10px] font-bold text-white transition-opacity ${enabled ? 'opacity-100' : 'opacity-0'}`}>ON</span>
    </button>
);
}

export function ToolManager() {
    const { user: adminUser } = useUser();
    const [toolSettings, setToolSettings] = useState<ToolSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchToolSettings = useCallback(async () => {
        setLoading(true);
        try {
            const settings = await getGlobalToolSettings();
            setToolSettings(settings);
        } catch (error: any) {
            setToast({ message: error.message || 'Falha ao carregar configurações de ferramentas.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchToolSettings();
    }, [fetchToolSettings]);

    const handleToggleChange = (key: ServiceKey, enabled: boolean) => {
        setToolSettings(prev => prev.map(tool => 
            tool.key === key ? { ...tool, enabled } : tool
        ));
    };

    const handleSave = async () => {
        if (!adminUser) return;
        setSaving(true);
        try {
            await updateGlobalToolSettings(toolSettings, adminUser.id);
            setToast({ message: 'Configurações de ferramentas salvas com sucesso!', type: 'success' });
        } catch (error: any) {
            setToast({ message: error.message || 'Falha ao salvar configurações de ferramentas.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center p-8">
                <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                <p className="mt-2 text-gray-500">Carregando configurações das ferramentas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#263238]">Gerenciar Ferramentas</h2>
                        <p className="text-sm text-gray-500">Ative ou desative a visibilidade de cada ferramenta da Creator Suite globalmente.</p>
                        <p className="text-xs text-red-500 mt-2"><i className="fas fa-exclamation-triangle mr-1"></i> Ferramentas desativadas aqui não aparecerão para nenhum usuário, independentemente do plano.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 font-bold text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                    >
                        {saving ? <><i className="fas fa-spinner fa-spin"></i>Salvando...</> : <><i className="fas fa-save"></i>Salvar Configurações</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CREATOR_SUITE_MODES.map(modeConfig => {
                        const currentSetting = toolSettings.find(s => s.key === modeConfig.value);
                        const isEnabled = currentSetting ? currentSetting.enabled : true; // Default to enabled if not found

                        // Fallback para ícone e cor, garantindo que sempre há algo
                        const iconClass = SERVICE_ICONS[modeConfig.value] || 'fa-question-circle'; 
                        const colorClasses = SERVICE_COLORS[modeConfig.value] || 'text-gray-600 bg-gray-100';
                        const [textColor, bgColor] = colorClasses.split(' ');

                        return (
                            <div 
                                key={modeConfig.value} 
                                className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center text-lg ${bgColor} ${textColor}`}>
                                        <i className={`fas ${iconClass}`}></i>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-sm">{modeConfig.label}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-1">{modeConfig.placeholder}</p>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    enabled={isEnabled} 
                                    onChange={(e) => handleToggleChange(modeConfig.value, e)} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
