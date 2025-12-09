
import React, { useState } from 'react';
import { WhatsAppInstance } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface InstanceSettingsProps {
    instances: WhatsAppInstance[];
    onAdd: (instance: WhatsAppInstance) => void;
    onDelete: (id: string) => void;
    maxInstances: number;
    canAddMore: boolean;
    planName: string;
}

export function InstanceSettings({ instances, onAdd, onDelete, maxInstances, canAddMore, planName }: InstanceSettingsProps) {
    const [adding, setAdding] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [newInstanceName, setNewInstanceName] = useState('');
    const [connecting, setConnecting] = useState(false);

    const handleStartAdd = () => {
        setAdding(true);
        setNewInstanceName('');
        setQrCode(null);
    };

    const handleGenerateQR = () => {
        if (!newInstanceName.trim()) return;
        setConnecting(true);
        
        // Simulação de chamada API para gerar QR
        setTimeout(() => {
            // QR Code falso (Placeholder image)
            setQrCode('https://via.placeholder.com/250x250.png?text=QR+Code+WhatsApp');
            setConnecting(false);
        }, 1500);
    };

    const handleSimulateScan = () => {
        if (!qrCode) return;
        setConnecting(true);
        
        // Simulação de conexão bem sucedida
        setTimeout(() => {
            const newInstance: WhatsAppInstance = {
                id: uuidv4(),
                user_id: 'current',
                name: newInstanceName,
                status: 'connected',
                api_provider: 'evolution',
                created_at: new Date().toISOString()
            };
            onAdd(newInstance);
            setAdding(false);
            setQrCode(null);
            setConnecting(false);
        }, 2000);
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-gray-50 flex">
            {/* Sidebar de Lista de Instâncias */}
            <div className="w-1/3 border-r border-gray-200 bg-white p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Meus Números</h2>
                    <p className="text-sm text-gray-500">Gerencie suas conexões de WhatsApp.</p>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                        <span className="font-bold">Plano {planName}:</span> {instances.length} de {maxInstances} números utilizados.
                    </div>
                </div>

                <div className="space-y-3">
                    {instances.map(instance => (
                        <div key={instance.id} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${instance.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}>
                                    <i className="fab fa-whatsapp text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{instance.name}</h3>
                                    <p className={`text-xs font-medium ${instance.status === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
                                        {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onDelete(instance.id)}
                                className="text-gray-400 hover:text-red-500 p-2 transition"
                                title="Desconectar"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    ))}

                    {canAddMore ? (
                        <button 
                            onClick={handleStartAdd}
                            disabled={adding}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-[#00A884] hover:text-[#00A884] transition flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-plus"></i> Adicionar Novo Número
                        </button>
                    ) : (
                        <div className="text-center p-3 text-xs text-orange-600 bg-orange-50 rounded border border-orange-100">
                            Limite do plano atingido. Faça upgrade para adicionar mais.
                        </div>
                    )}
                </div>
            </div>

            {/* Área Principal - Configuração / QR */}
            <div className="flex-1 p-8 flex items-center justify-center">
                {!adding ? (
                    <div className="text-center text-gray-400">
                        <i className="fas fa-network-wired text-6xl mb-4 opacity-20"></i>
                        <p className="text-lg">Selecione um número ou adicione um novo para configurar.</p>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Conectar WhatsApp</h3>
                        
                        {!qrCode ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Nome de Identificação</label>
                                    <input 
                                        type="text" 
                                        value={newInstanceName}
                                        onChange={(e) => setNewInstanceName(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-[#00A884]"
                                        placeholder="Ex: Comercial, Suporte"
                                    />
                                </div>
                                <button 
                                    onClick={handleGenerateQR}
                                    disabled={!newInstanceName.trim() || connecting}
                                    className="w-full bg-[#00A884] hover:bg-[#008F6F] text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                                >
                                    {connecting ? <i className="fas fa-spinner fa-spin"></i> : 'Gerar QR Code'}
                                </button>
                                <button onClick={() => setAdding(false)} className="w-full text-gray-500 text-sm mt-2 hover:underline">Cancelar</button>
                            </div>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg inline-block">
                                    <img src={qrCode} alt="QR Code" className="w-48 h-48 object-contain" />
                                </div>
                                <div className="text-sm text-gray-600">
                                    <p>1. Abra o WhatsApp no seu celular</p>
                                    <p>2. Toque em Menu ou Configurações e selecione <strong>Aparelhos conectados</strong></p>
                                    <p>3. Aponte seu celular para esta tela</p>
                                </div>
                                
                                {/* Botão de simulação apenas para demo frontend */}
                                <button 
                                    onClick={handleSimulateScan}
                                    disabled={connecting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition text-sm"
                                >
                                    {connecting ? 'Conectando...' : '[SIMULAR ESCANEAMENTO]'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
