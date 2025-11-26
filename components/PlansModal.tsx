import React, { useState } from 'react';
import { UserPlan } from '../types/plan.types'; // Usar UserPlan do plan.types
import { PlanCard } from './PlanCard'; // Importar o novo PlanCard
import { usePlans } from '../hooks/usePlans'; // Importar o novo hook usePlans
import { useUser } from '../contexts/UserContext';
import { handlePlanSubscription, handleCreditPurchase } from '../services/paymentService';
import { Toast } from './admin/Toast';
import { MercadoPagoCheckout } from './MercadoPagoCheckout'; // Importar o novo componente de checkout MP

interface PlansModalProps {
  currentPlanId: UserPlan; // Renomeado para ID para maior clareza
  onClose: () => void;
  // onSelectPlan: (planId: UserPlan) => void; // Removido, a lógica agora é interna
  // onBuyCredits: (amount: number, price: number) => void; // Removido, a lógica agora é interna
}

export function PlansModal({ currentPlanId, onClose }: PlansModalProps) {
  const { user, refresh: refreshUser } = useUser();
  const { allPlans, loading: loadingPlans, error: plansError } = usePlans(); // Usar o hook usePlans
  
  const [expressAmount, setExpressAmount] = useState(10);
  // FIX: Updated the type for the `toast` state to include 'info', aligning it with the ToastProps interface.
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // States para o checkout transparente do Mercado Pago
  const [showMpCheckout, setShowMpCheckout] = useState(false);
  const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [mpPaymentAmount, setMpPaymentAmount] = useState<number>(0);
  const [mpPaymentType, setMpPaymentType] = useState<'plan' | 'credits' | null>(null);

  // Encontra o plano ativo com base nos planos carregados dinamicamente
  const activePlanConfig = allPlans.find(p => p.id === currentPlanId) || allPlans.find(p => p.id === 'free') || { // Fallback robusto
    id: 'free',
    name: 'Free',
    credits: 0,
    price: 0,
    interval: 'month',
    isActive: true,
    color: 'gray',
    expressCreditPrice: 15.00,
    services: [],
  };

  const handleExpressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpressAmount(parseInt(e.target.value) || 0);
  };

  const calculateExpressTotal = () => {
    return expressAmount * activePlanConfig.expressCreditPrice;
  };
  
  const handleInitiatePlanPayment = async (planId: UserPlan) => {
    if (!user) {
        setToast({ message: "Sessão inválida. Faça login novamente.", type: 'error' });
        return;
    }
    // FIX: Updated the type for the `toast` message to include 'info', aligning it with the ToastProps interface.
    setToast({ message: "Iniciando pagamento do plano...", type: 'info' });
    try {
        const { preferenceId, publicKey } = await handlePlanSubscription(planId, user);
        setMpPreferenceId(preferenceId);
        setMpPublicKey(publicKey);
        setMpPaymentAmount(allPlans.find(p => p.id === planId)?.price || 0);
        setMpPaymentType('plan');
        setShowMpCheckout(true);
        setToast(null); // Limpa o toast para a próxima etapa
    } catch (e: any) {
        setToast({ message: e.message, type: 'error' });
    }
  };

  const handleInitiateCreditPayment = async (amount: number, price: number) => {
    if (!user) {
        setToast({ message: "Sessão inválida. Faça login novamente.", type: 'error' });
        return;
    }
    // FIX: Updated the type for the `toast` message to include 'info', aligning it with the ToastProps interface.
    setToast({ message: "Iniciando compra de créditos...", type: 'info' });
    try {
        const { preferenceId, publicKey } = await handleCreditPurchase(amount, price, user);
        setMpPreferenceId(preferenceId);
        setMpPublicKey(publicKey);
        setMpPaymentAmount(price);
        setMpPaymentType('credits');
        setShowMpCheckout(true);
        setToast(null); // Limpa o toast para a próxima etapa
    } catch (e: any) {
        setToast({ message: e.message, type: 'error' });
    }
  };

  const handlePaymentSuccess = () => {
    setToast({ message: "Pagamento realizado com sucesso! Atualizando seu saldo...", type: 'success' });
    refreshUser(); // Força a atualização dos dados do usuário (plano, créditos)
    setShowMpCheckout(false); // Fecha o modal de checkout MP
    onClose(); // Fecha o PlansModal
  };

  const handlePaymentError = (message: string) => {
    setToast({ message: `Erro no pagamento: ${message}`, type: 'error' });
    setShowMpCheckout(false); // Fecha o modal de checkout MP para permitir nova tentativa
  };

  if (loadingPlans) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-green-400"></i>
          <p className="mt-4 text-white text-lg">Carregando planos...</p>
        </div>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg text-center">
          <p className="font-bold">Erro ao carregar planos:</p>
          <p className="text-sm">{plansError}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-black border border-green-900/50 rounded-2xl shadow-2xl w-full max-w-7xl my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-green-900/30 flex justify-between items-center sticky top-0 bg-black z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Escolha seu Plano</h2>
            <p className="text-sm text-gray-400">Cada nível superior desbloqueia novas IAs e recursos exclusivos.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Subscription Plans Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {allPlans.map((plan) => (
               <PlanCard 
                 key={plan.id}
                 plan={plan}
                 isCurrent={currentPlanId === plan.id}
                 onSelect={handleInitiatePlanPayment} // Passa a nova função
               />
            ))}
          </div>

          {/* Express Credits Section */}
          <div className="bg-gradient-to-r from-gray-900 to-black border border-green-900/30 rounded-xl p-6 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <i className="fas fa-bolt text-9xl text-yellow-500"></i>
             </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
              <div className="flex-1">
                <h3 className="text-yellow-400 font-bold uppercase tracking-wider mb-2 text-lg">
                  <i className="fas fa-bolt mr-2"></i>Recarga Expressa
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  Precisa de mais gerações agora? Compre créditos avulsos sem mudar seu plano mensal.
                  <br/>
                  <span className="text-gray-500 text-xs mt-1 block">Pagamento único via Pix ou Cartão (Mercado Pago).</span>
                </p>
                <div className="inline-block bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-4 py-2">
                   <span className="text-gray-400 text-xs uppercase mr-2">Custo atual:</span>
                   <span className="text-xl font-bold text-yellow-500">R$ {activePlanConfig.expressCreditPrice.toFixed(2).replace('.', ',')}</span>
                   <span className="text-xs text-yellow-300 ml-1">/crédito</span>
                </div>
              </div>

              <div className="flex-1 w-full max-w-md bg-gray-950/80 p-6 rounded-lg border border-gray-800 backdrop-blur-sm">
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Quantidade Desejada</label>
                    <span className="text-xs font-bold text-white bg-gray-700 px-2 py-0.5 rounded">{expressAmount} créditos</span>
                </div>
                
                <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    step="5" 
                    value={expressAmount} 
                    onChange={handleExpressChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 mb-6"
                />
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
                    <p className="text-3xl font-bold text-white">R$ {calculateExpressTotal().toFixed(2).replace('.', ',')}</p>
                  </div>
                  <button 
                    onClick={() => handleInitiateCreditPayment(expressAmount, calculateExpressTotal())} // Passa a nova função
                    className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition shadow-lg shadow-yellow-600/20 flex items-center"
                  >
                    Pagar com Mercado Pago <i className="fas fa-credit-card ml-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Mercado Pago Checkout Modal */}
      {showMpCheckout && mpPreferenceId && mpPublicKey && mpPaymentAmount > 0 && user && (
        <MercadoPagoCheckout
          preferenceId={mpPreferenceId}
          publicKey={mpPublicKey}
          amount={mpPaymentAmount}
          userEmail={user.email}
          paymentType={mpPaymentType}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={() => setShowMpCheckout(false)}
        />
      )}
    </div>
  );
}