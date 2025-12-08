
import React, { useState } from 'react';
import { createWhatsAppInstance } from '../../services/chatService';
import { Toast } from '../admin/Toast';

interface WhatsAppConnectProps {
    onClose: () => void;
    onSuccess: () => void;
    currentCount: number;
    maxLimit: number;
}

export function WhatsAppConnect({ onClose, onSuccess, currentCount, maxLimit }: WhatsAppConnectProps) {
    const [name, setName] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (currentCount >= maxLimit) {
            setToast({ message: `Limite do plano atingido (${maxLimit} números). Faça upgrade para adicionar mais.`, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            // Simulate API connection
            await createWhatsAppInstance(name, apiUrl, token);
            setStep(2);
            // Simulate getting QR Code from Evolution/Z-API
            setQrCode('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg'); 
            
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 5000); // Auto close after "scan" simulation
        } catch (error) {
            setToast({ message: "Erro ao conectar. Verifique a URL da API.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#263238] flex items-center gap-2">
                        <i className="fab fa-whatsapp text-green-500"></i> Conectar Novo Número
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100 mb-4">
                                <p className="font-bold mb-1">Como funciona?</p>
                                <p>O GDN_IA utiliza APIs externas para conectar ao WhatsApp (Ex: Evolution API, Z-API). Insira os dados da sua instância abaixo.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Instância</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" 
                                    placeholder="Ex: Atendimento Comercial"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da API</label>
                                <input 
                                    type="url" 
                                    value={apiUrl} 
                                    onChange={e => setApiUrl(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" 
                                    placeholder="https://api.seudominio.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Token (Global Key)</label>
                                <input 
                                    type="password" 
                                    value={token} 
                                    onChange={e => setToken(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-green-500" 
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Gerar QR Code'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-600">Abra o WhatsApp no seu celular e escaneie o código abaixo:</p>
                            <div className="border-4 border-gray-800 rounded-lg p-2 inline-block">
                                {qrCode && <img src={qrCode} alt="QR Code" className="w-48 h-48" />}
                            </div>
                            <p className="text-xs text-green-600 font-bold animate-pulse">Aguardando leitura...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
