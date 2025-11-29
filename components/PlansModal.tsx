
import React, { useState, useEffect } from 'react';
import { UserPlan } from '../types/plan.types';
import { PlanCard } from './PlanCard';
import { usePlans } from '../hooks/usePlans';
import { useUser } from '../contexts/UserContext';
import { Toast } from './admin/Toast';
import { getPaymentSettings } from '../services/adminService'; // For fetching public keys
import CheckoutCompleto from './CheckoutCompleto'; // Import the new combined checkout component

interface PlansModalProps {
  currentPlanId: UserPlan;
  onClose: () => void;
  onSelectPlan: () => void; // No-op, actual logic is in this modal now
  onBuyCredits: () => void; // No-op, actual logic is in this modal now
}

export function PlansModal({ currentPlanId, onClose, onSelectPlan, onBuyCredits: onBuyCreditsProp }: PlansModalProps) {
  const { user, refresh } = useUser();
  const { allPlans, loading: loadingPlans, error: plansError } = usePlans();
  
  const [expressAmount, setExpressAmount] = useState(10);
  
  // State for the new combined checkout component
  const [showCheckoutCompleto, setShowCheckoutCompleto] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ type: 'plan' | 'credits'; data: any } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // State for dynamic public keys
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [asaasPublicKey, setAsaasPublicKey] = useState<string | null>(null);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(true);
  const [paymentSettingsError, setPaymentSettingsError] = useState<string | null>(null);

  // Fetch payment settings (public keys)
  useEffect(() => {
    const fetchKeys = async () => {
      setLoadingPaymentSettings(true);
      try {
        const settings = await getPaymentSettings();
        if (settings.gateways.mercadoPago.enabled) {
          setMpPublicKey(settings.gateways.mercadoPago.publicKey);
        }
        if (settings.gateways.asaas.enabled) {
          setAsaasPublicKey(settings.gateways.asaas.publicKey);
        }
      } catch (err: any) {
        setPaymentSettingsError(err.message || "Falha ao carregar configurações de pagamento.");
      } finally {
        setLoadingPaymentSettings(false);
      }
    };
    fetchKeys();
  }, []);


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

  const handleOpenCheckoutCompleto = (item: { type: 'plan' | 'credits'; data: any }) => {
    if (!user) {
        setToast({ message: "Por favor, faça login para continuar com o pagamento.", type: 'error' });
        return;
    }
    setSelectedPaymentItem(item);
    setShowCheckoutCompleto(true);
    // Any other setup for checkout
  };

  const handleCheckoutSuccess = async () => {
    setToast({ message: "Pagamento processado com sucesso! Seus créditos ou plano foram atualizados.", type: 'success' });
    await refresh(); // Refresh user credits and plan
    setTimeout(() => onClose(), 2000); // Close modal after showing success
    setShowCheckoutCompleto(false); // Close checkout view
  };

  const handleCheckoutError = (message: string) => {
    setToast({ message: message, type: 'error' });
    // Keep checkout open for user to try again or change gateway
  };

  const handleCheckoutCancel = () => {
    setShowCheckoutCompleto(false);
    setSelectedPaymentItem(null);
  };


  if (loadingPlans || loadingPaymentSettings) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-green-400"></i>
          <p className="mt-4 text-white text-lg">Carregando planos e configurações...</p>
        </div>
      </div>
    );
  }

  if (plansError || paymentSettingsError) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg text-center">
          <p className="font-bold">Erro ao carregar planos ou configurações de pagamento:</p>
          <p className="text-sm">{plansError || paymentSettingsError}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Fechar</button>
        </div>
      </div>
    );
  }

  if (showCheckoutCompleto && selectedPaymentItem) {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <CheckoutCompleto
                amount={selectedPaymentItem.data.price}
                itemType={selectedPaymentItem.type}
                itemId={selectedPaymentItem.data.planId || selectedPaymentItem.data.amount.toString()} // itemId can be planId or credits amount
                mpPublicKey={mpPublicKey}
                // Pass the asaasPublicKey prop
                asaasPublicKey={asaasPublicKey}
                onSuccess={handleCheckoutSuccess}
                onError={handleCheckoutError}
                onCancel={handleCheckoutCancel}
            />
             {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
                 onSelect={() => handleOpenCheckoutCompleto({ type: 'plan', data: { planId: plan.id, price: plan.price } })}
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
                    onClick={() => handleOpenCheckoutCompleto({ type: 'credits', data: { amount: expressAmount, price: calculateExpressTotal() } })}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition shadow-lg shadow-yellow-600/20 flex items-center"
                  >
                    Recarregar Créditos <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}