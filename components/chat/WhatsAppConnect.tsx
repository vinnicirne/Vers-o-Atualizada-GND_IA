
import React, { useState, useEffect } from 'react';
import { createWhatsAppInstance, simulateQrScan } from '../../services/chatService';
import { Toast } from '../admin/Toast';

interface WhatsAppConnectProps {
    onClose: () => void;
    onSuccess: () => void;
    currentCount: number;
    maxLimit: number;
}

type ConnectionMethod = 'gateway' | 'official';

export function WhatsAppConnect({ onClose, onSuccess, currentCount, maxLimit }: WhatsAppConnectProps) {
    const [method, setMethod] = useState<ConnectionMethod>('gateway');
    const [name, setName] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    
    // QR Code Flow State
    const [qrStep, setQrStep] = useState(1); // 1 = Input Name, 2 = Generating, 3 = Show QR, 4 = Success
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
    
    const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

    const handleCreateForQR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        if (currentCount >= maxLimit) {
            setToast({ message: `Limite do plano atingido (${maxLimit} números). Faça upgrade.`, type: 'error' });
            return;
        }

        setLoading(true);
        setQrStep(2); // Generating UI

        try {
            // 1. Cria a instância no DB com status "qr_ready"
            const instance = await createWhatsAppInstance(name, 'gateway');
            setCurrentInstanceId(instance.id);

            // 2. Simula o fetch do QR Code (na prática viria do backend do Evolution API/Z-API)
            setTimeout(() => {
                // QR Code de exemplo (Wikipedia)
                setQrCode('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg'); 
                setQrStep(3);
                setLoading(false);
                
                // 3. Inicia polling/simulação de leitura
                simulateScanEffect(instance.id);
            }, 1500);

        } catch (error) {
            setToast({ message: "Erro ao gerar instância.", type: 'error' });
            setQrStep(1);
            setLoading(false);
        }
    };

    const simulateScanEffect = async (id: string) => {
        // Simula o usuário lendo o QR após 5 segundos
        setTimeout(async () => {
            await simulateQrScan(id);
            setQrStep(4); // Success
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        }, 5000);
    };

    const handleOfficialConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (currentCount >= maxLimit) {
            setToast({ message: `Limite do plano atingido (${maxLimit} números).`, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await createWhatsAppInstance(name, 'official', apiUrl, token);
            setToast({ message: "Conectado à API Oficial!", type: 'success' });
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (error) {
            setToast({ message: "Erro na conexão API.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-[#263238] flex items-center gap-2">
                        <i className="fab fa-whatsapp text-green-600"></i> Conectar WhatsApp
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setMethod('gateway')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${method === 'gateway' ? 'border-green-500 text-green-700 bg-green-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                    >
                        <i className="fas fa-qrcode mr-2"></i> Ler QR Code
                    </button>
                    <button 
                        onClick={() => setMethod('official')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${method === 'official' ? 'border-blue-500 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                    >
                        <i className="fas fa-code mr-2"></i> API Oficial
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* FLUXO QR CODE (GATEWAY) */}
                    {method === 'gateway' && (
                        <div className="space-y-6">
                            {qrStep === 1 && (
                                <form onSubmit={handleCreateForQR} className="space-y-4">
                                    <div className="bg-green-50 p-3 rounded-lg text-xs text-green-800 border border-green-200 flex gap-2">
                                        <i className="fas fa-mobile-alt text-lg"></i>
                                        <div>
                                            <p className="font-bold">Modo Web (Espelhamento)</p>
                                            <p>Conecte seu número atual escaneando um QR Code, igual ao WhatsApp Web. Simples e rápido.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Identificação</label>
                                        <input 
                                            type="text" 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-green-500 focus:border-green-500 outline-none" 
                                            placeholder="Ex: Meu Número Pessoal"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-[#00A884] hover:bg-[#008f6f] text-white font-bold py-3 rounded-lg transition shadow-lg shadow-green-900/10 flex items-center justify-center gap-2"
                                    >
                                        Continuar <i className="fas fa-arrow-right"></i>
                                    </button>
                                </form>
                            )}

                            {qrStep === 2 && (
                                <div className="text-center py-12">
                                    <div className="relative w-20 h-20 mx-auto mb-4">
                                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                                        <i className="fas fa-qrcode absolute inset-0 flex items-center justify-center text-gray-400 text-2xl"></i>
                                    </div>
                                    <p className="text-gray-600 font-bold">Gerando sessão segura...</p>
                                    <p className="text-xs text-gray-400 mt-1">Isso leva apenas alguns segundos.</p>
                                </div>
                            )}

                            {qrStep === 3 && (
                                <div className="flex flex-col items-center animate-fade-in-up">
                                    <p className="text-sm font-bold text-gray-700 mb-4">Abra o WhatsApp {'>'} Aparelhos conectados {'>'} Conectar</p>
                                    
                                    <div className="relative p-4 bg-white border-2 border-gray-800 rounded-2xl shadow-xl mb-4">
                                        {/* Mock Phone Frame UI */}
                                        <div className="w-64 h-64 bg-white flex items-center justify-center relative overflow-hidden">
                                            {qrCode && <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />}
                                            
                                            {/* Scan line animation */}
                                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <i className="fas fa-circle-notch fa-spin text-green-500"></i>
                                        Aguardando leitura do código...
                                    </div>
                                </div>
                            )}

                            {qrStep === 4 && (
                                <div className="text-center py-8 animate-fade-in">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-4xl">
                                        <i className="fas fa-check"></i>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800">Conectado!</h4>
                                    <p className="text-gray-500 text-sm mt-2">Seu WhatsApp foi vinculado com sucesso.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FLUXO API OFICIAL (META) */}
                    {method === 'official' && (
                        <form onSubmit={handleOfficialConnect} className="space-y-4 animate-fade-in">
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-200">
                                <p className="font-bold mb-1"><i className="fas fa-info-circle"></i> Integração Oficial (Meta)</p>
                                <p>Use este método para números Business API verificados. Requer Token Permanente e ID do Telefone do painel Meta Developers.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Instância</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" 
                                    placeholder="Ex: Comercial Oficial"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number ID</label>
                                <input 
                                    type="text" 
                                    value={apiUrl} 
                                    onChange={e => setApiUrl(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none font-mono" 
                                    placeholder="Ex: 10593..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Token (Permanente)</label>
                                <input 
                                    type="password" 
                                    value={token} 
                                    onChange={e => setToken(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none font-mono" 
                                    placeholder="EAAG..."
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar e Conectar'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
