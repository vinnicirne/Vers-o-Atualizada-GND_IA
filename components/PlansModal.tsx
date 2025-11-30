
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null); // Added 'info' type

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
    
    // Check if amount is valid (greater than 0)
    const paymentAmount = item.data.price || item.data.amount; // Use price for plan, amount for credits
    if (paymentAmount <= 0) {
        setToast({ message: "Este item não possui custo e não requer pagamento.", type: 'info' });
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="text-center bg-white border border-gray-200 p-6 rounded-lg shadow-xl">
          <i className="fas fa-spinner fa-spin text-4xl text-[#F39C12]"></i>
          <p className="mt-4 text-gray-500 text-lg">Carregando planos e configurações...</p>
        </div>
      </div>
    );
  }

  if (plansError || paymentSettingsError) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white border border-red-200 text-red-500 px-6 py-4 rounded-lg text-center shadow-xl">
          <p className="font-bold">Erro ao carregar planos ou configurações de pagamento:</p>
          <p className="text-sm">{plansError || paymentSettingsError}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold">Fechar</button>
        </div>
      </div>
    );
  }

  if (showCheckoutCompleto && selectedPaymentItem) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <CheckoutCompleto
                amount={selectedPaymentItem.data.price || selectedPaymentItem.data.amount}
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-7xl my-8 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header - Light Theme */}
        <div className="p-6 bg-white border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#263238]">Escolha seu Plano</h2>
            <p className="text-sm text-gray-500">Cada nível superior desbloqueia novas IAs e recursos exclusivos.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#263238] transition">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-[#ECEFF1]">
          
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

          {/* Express Credits Section - Light Design */}
          <div className="bg-white rounded-xl p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row gap-8 items-center border border-gray-200">
             
             {/* Left Content */}
             <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-bolt text-[#F39C12]"></i>
                    <h3 className="text-[#F39C12] font-bold uppercase tracking-wider text-lg">
                      RECARGA EXPRESSA
                    </h3>
                </div>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Precisa de mais gerações agora? Compre créditos avulsos sem mudar seu plano mensal.
                  <br/>
                  <span className="text-gray-400 text-xs">Pagamento único via Pix ou Cartão (Mercado Pago).</span>
                </p>
                
                <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-md px-4 py-2">
                   <span className="text-gray-500 text-xs uppercase font-bold">CUSTO ATUAL:</span>
                   <span className="text-xl font-bold text-[#F39C12]">R$ {activePlanConfig.expressCreditPrice.toFixed(2).replace('.', ',')}</span>
                   <span className="text-xs text-[#F39C12] opacity-80">/crédito</span>
                </div>
             </div>

             {/* Right Interactive Box */}
             <div className="flex-1 w-full max-w-md bg-[#F8FAFC] p-6 rounded-xl border border-gray-200 relative z-10 shadow-inner">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">QUANTIDADE DESEJADA</label>
                    <span className="text-xs font-bold text-[#263238] bg-white border border-gray-300 px-2 py-1 rounded shadow-sm">{expressAmount} créditos</span>
                </div>
                
                <div className="mb-8">
                    <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        step="5" 
                        value={expressAmount} 
                        onChange={handleExpressChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#F39C12]"
                        style={{
                            background: `linear-gradient(to right, #F39C12 0%, #F39C12 ${(expressAmount - 5) / (100 - 5) * 100}%, #e2e8f0 ${(expressAmount - 5) / (100 - 5) * 100}%, #e2e8f0 100%)`
                        }}
                    />
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total a pagar</p>
                    <p className="text-3xl font-bold text-[#263238] tracking-tight">R$ {calculateExpressTotal().toFixed(2).replace('.', ',')}</p>
                  </div>
                  <button 
                    onClick={() => handleOpenCheckoutCompleto({ type: 'credits', data: { amount: expressAmount, price: calculateExpressTotal() } })}
                    className="bg-[#D97706] hover:bg-[#F59E0B] text-white font-bold px-6 py-3 rounded-lg transition-all shadow-lg shadow-orange-200 flex items-center gap-2 transform hover:-translate-y-0.5"
                  >
                    Recarregar Créditos <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
             </div>
             
             {/* Decorative Background Element */}
             <div className="absolute -top-10 -right-10 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl pointer-events-none"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
