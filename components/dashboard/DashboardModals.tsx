

import React from 'react';
import { PlansModal } from '../PlansModal';
import { UserHistoryModal } from '../UserHistoryModal';
import { ManualModal } from '../ManualModal';
import { AffiliateModal } from '../AffiliateModal';
import { IntegrationsModal } from '../integrations/IntegrationsModal';
import { User } from '../../types';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext'; // NOVO

interface DashboardModalsProps {
    modals: {
        plans: boolean;
        history: boolean;
        manual: boolean;
        affiliate: boolean;
        integrations: boolean;
        guestLimit: boolean;
        featureLock: boolean;
    };
    toggleModal: (modal: keyof DashboardModalsProps['modals'], value: boolean) => void;
    user: User | null;
    onNavigateToLogin: () => void;
}

export function DashboardModals({ 
    modals, 
    toggleModal, 
    user, 
    onNavigateToLogin 
}: DashboardModalsProps) {
    const { settings: whiteLabelSettings } = useWhiteLabel(); // NOVO

    return (
        <>
            {modals.plans && (
                <PlansModal 
                    currentPlanId={user?.plan || 'free'} 
                    onClose={() => toggleModal('plans', false)}
                    onSelectPlan={() => {}} 
                    onBuyCredits={() => {}}
                />
            )}

            {modals.history && user && (
                <UserHistoryModal userId={user.id} onClose={() => toggleModal('history', false)} />
            )}

            {modals.manual && (
                <ManualModal onClose={() => toggleModal('manual', false)} />
            )}

            {modals.affiliate && (
                <AffiliateModal onClose={() => toggleModal('affiliate', false)} />
            )}

            {modals.integrations && (
                <IntegrationsModal onClose={() => toggleModal('integrations', false)} />
            )}

            {/* GUEST LIMIT MODAL */}
            {modals.guestLimit && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-green-500">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-2xl">
                            <i className="fas fa-lock"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Limite de Visitante Atingido</h3>
                        <p className="text-gray-600 mb-6">
                            Você usou seus 3 créditos gratuitos de teste. Para continuar gerando conteúdo ilimitado, crie sua conta agora!
                        </p>
                        <div className="space-y-3">
                            <button 
                                onClick={onNavigateToLogin}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
                            >
                                Criar Conta Grátis
                            </button>
                            <button 
                                onClick={() => toggleModal('guestLimit', false)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-lg transition"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEATURE LOCK MODAL */}
            {modals.featureLock && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-[#F39C12]">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 text-2xl">
                            <i className="fas fa-star"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Recurso Exclusivo</h3>
                        <p className="text-gray-600 mb-6">
                            Esta ferramenta é exclusiva para usuários registrados. Crie sua conta gratuita agora e desbloqueie o poder total do <strong>{whiteLabelSettings.appName}</strong>, incluindo todas as ferramentas avançadas!
                        </p>
                        <div className="space-y-3">
                            <button 
                                onClick={onNavigateToLogin}
                                className="w-full bg-[#F39C12] hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
                            >
                                Criar Conta Grátis e Desbloquear
                            </button>
                            <button 
                                onClick={() => toggleModal('featureLock', false)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-lg transition"
                            >
                                Talvez Depois
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}