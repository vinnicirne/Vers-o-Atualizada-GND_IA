
import React from 'react';
<<<<<<< HEAD
=======
import { Lock, Star, X as CloseIcon } from 'lucide-react';
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
import { PlansModal } from '../PlansModal';
import { UserHistoryModal } from '../UserHistoryModal';
import { ManualModal } from '../ManualModal';
import { AffiliateModal } from '../AffiliateModal';
import { IntegrationsModal } from '../integrations/IntegrationsModal';
import { User } from '../../types';

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

<<<<<<< HEAD
export function DashboardModals({ 
    modals, 
    toggleModal, 
    user, 
    onNavigateToLogin 
=======
export function DashboardModals({
    modals,
    toggleModal,
    user,
    onNavigateToLogin
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
}: DashboardModalsProps) {
    return (
        <>
            {modals.plans && (
<<<<<<< HEAD
                <PlansModal 
                    currentPlanId={user?.plan || 'free'} 
                    onClose={() => toggleModal('plans', false)}
                    onSelectPlan={() => {}} 
                    onBuyCredits={() => {}}
=======
                <PlansModal
                    currentPlanId={user?.plan || 'free'}
                    onClose={() => toggleModal('plans', false)}
                    onSelectPlan={() => { }}
                    onBuyCredits={() => { }}
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
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
<<<<<<< HEAD
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
=======
                <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16"></div>
                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-sm rotate-3">
                            <Lock className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Limite de Teste Atingido</h3>
                        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                            Você esgotou seus créditos gratuitos. Desbloqueie o poder total da IA avançada criando sua conta agora mesmo!
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={onNavigateToLogin}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
                            >
                                Criar Minha Conta Grátis
                            </button>
                            <button
                                onClick={() => toggleModal('guestLimit', false)}
                                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold py-3 rounded-2xl transition-all text-xs uppercase tracking-widest"
                            >
                                Continuar Navegando
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEATURE LOCK MODAL */}
            {modals.featureLock && (
<<<<<<< HEAD
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl border-t-4 border-[#F39C12]">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 text-2xl">
                            <i className="fas fa-star"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Recurso Exclusivo</h3>
                        <p className="text-gray-600 mb-6">
                            Esta ferramenta está disponível apenas para usuários cadastrados. Crie sua conta grátis para desbloquear!
                        </p>
                        <div className="space-y-3">
                            <button 
                                onClick={onNavigateToLogin}
                                className="w-full bg-[#F39C12] hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
                            >
                                Desbloquear Agora
                            </button>
                            <button 
                                onClick={() => toggleModal('featureLock', false)}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-lg transition"
=======
                <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full -ml-16 -mb-16"></div>
                        <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600 shadow-sm -rotate-3">
                            <Star className="w-10 h-10 fill-purple-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Recurso Premium</h3>
                        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                            Esta ferramenta exclusiva está disponível apenas para membros. Cadastre-se em segundos para começar a usar!
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={onNavigateToLogin}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
                            >
                                Desbloquear Agora
                            </button>
                            <button
                                onClick={() => toggleModal('featureLock', false)}
                                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold py-3 rounded-2xl transition-all text-xs uppercase tracking-widest"
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
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
