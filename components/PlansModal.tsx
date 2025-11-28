
import React, { useState } from 'react';
import { UserPlan } from '../types/plan.types'; // Usar UserPlan do plan.types
import { PlanCard } from './PlanCard'; // Importar o novo PlanCard
import { usePlans } from '../hooks/usePlans'; // Importar o novo hook usePlans
import { handlePlanSubscription, handleCreditPurchase } from '../services/paymentService';
import { useUser } from '../contexts/UserContext';
import { Toast } from './admin/Toast';

interface PlansModalProps {
  currentPlanId: UserPlan; // Renomeado para ID para maior clareza
  onClose: () => void;
  // Alterado para não chamar diretamente o pagamento, mas sim o handler no modal
  // As funções onSelectPlan e onBuyCredits agora não esperam mais retorno de URL
  onSelectPlan: () => void; // Removido planId do parâmetro pois o handleConfirmPayment vai lidar com o item
  onBuyCredits: () => void; // Removido amount/price do parâmetro
}

export function PlansModal({ currentPlanId, onClose, onSelectPlan, onBuyCredits: onBuyCreditsProp }: PlansModalProps) {
  const { user, refresh } = useUser();
  const { allPlans, loading: loadingPlans, error: plansError } = usePlans(); // Usar o hook usePlans
  
  const [expressAmount, setExpressAmount] = useState(10);
  
  // State para o checkout transparente
  const [showTransparentCheckout, setShowTransparentCheckout] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ type: 'plan' | 'credits'; data: any } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

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

  const handleOpenTransparentCheckout = (item: { type: 'plan' | 'credits'; data: any }) => {
    setSelectedPaymentItem(item);
    setShowTransparentCheckout(true);
    setPaymentResult(null); // Reset any previous result
    // Clear card details when opening checkout
    setCardNumber('');
    setCardHolderName('');
    setExpiryDate('');
    setCvc('');
  };

  const handleCloseTransparentCheckout = () => {
    setShowTransparentCheckout(false);
    setSelectedPaymentItem(null);
    setPaymentResult(null);
    setPaymentInProgress(false);
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedPaymentItem) return;

    setPaymentInProgress(true);
    setPaymentResult(null);

    const cardDetails = { cardNumber, cardHolderName, expiryDate, cvc };

    try {
      let result: { success: boolean; message: string };
      if (selectedPaymentItem.type === 'plan') {
        result = await handlePlanSubscription(selectedPaymentItem.data.planId, user, cardDetails);
      } else { // 'credits'
        result = await handleCreditPurchase(selectedPaymentItem.data.amount, selectedPaymentItem.data.price, user, cardDetails);
      }
      
      setPaymentResult(result);
      if (result.success) {
        setToast({ message: result.message, type: 'success' });
        await refresh(); // Refresh user credits and plan
        setTimeout(() => onClose(), 2000); // Close modal after showing success
      } else {
        setToast({ message: result.message, type: 'error' });
      }

    } catch (e: any) {
      setPaymentResult({ success: false, message: e.message || "Erro desconhecido ao processar pagamento." });
      setToast({ message: e.message || "Erro desconhecido ao processar pagamento.", type: 'error' });
    } finally {
      setPaymentInProgress(false);
    }
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
                 onSelect={() => handleOpenTransparentCheckout({ type: 'plan', data: { planId: plan.id, price: plan.price } })}
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
                    onClick={() => handleOpenTransparentCheckout({ type: 'credits', data: { amount: expressAmount, price: calculateExpressTotal() } })}
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

      {/* Transparent Checkout Modal (Simulated) */}
      {showTransparentCheckout && selectedPaymentItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-black rounded-lg shadow-xl w-full max-w-md border border-purple-500/50">
            <div className="p-6 border-b border-purple-900/30">
              <h2 className="text-xl font-bold text-white">
                <i className="fas fa-credit-card mr-2 text-purple-400"></i>
                Detalhes do Pagamento
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {selectedPaymentItem.type === 'plan' ? 
                  `Assinatura do Plano "${allPlans.find(p => p.id === selectedPaymentItem.data.planId)?.name || 'N/A'}"` : 
                  `Recarga de ${selectedPaymentItem.data.amount} créditos`}
                <br/>
                Total: <span className="font-bold text-white">R$ {selectedPaymentItem.data.price.toFixed(2).replace('.', ',')}</span>
              </p>
              <div className="mt-4 p-2 text-xs text-yellow-400 bg-yellow-900/20 rounded border border-yellow-700/30 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Este é um checkout transparente **simulado** para demonstração. Dados de cartão reais exigem um backend seguro (PCI-compliant).</span>
              </div>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmPayment(); }} className="p-6 space-y-4">
              <div>
                <label htmlFor="cardNumber" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Número do Cartão</label>
                <input type="text" id="cardNumber" placeholder="XXXX XXXX XXXX XXXX" 
                  className="w-full bg-black border-2 border-purple-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0" 
                  pattern="[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}" title="Formato: 1234 5678 1234 5678" required 
                  disabled={paymentInProgress}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cardHolderName" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Nome no Cartão</label>
                <input type="text" id="cardHolderName" placeholder="Nome Sobrenome" 
                  className="w-full bg-black border-2 border-purple-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0" 
                  required 
                  disabled={paymentInProgress}
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiryDate" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Validade (MM/AA)</label>
                  <input type="text" id="expiryDate" placeholder="MM/AA" 
                    className="w-full bg-black border-2 border-purple-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0" 
                    pattern="(0[1-9]|1[0-2])\/[0-9]{2}" title="Formato: MM/AA" required 
                    disabled={paymentInProgress}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="cvc" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">CVC</label>
                  <input type="text" id="cvc" placeholder="XXX" 
                    className="w-full bg-black border-2 border-purple-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0" 
                    pattern="[0-9]{3,4}" title="3 ou 4 dígitos" required 
                    disabled={paymentInProgress}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                  />
                </div>
              </div>

              {paymentResult && (
                <div className={`p-3 rounded text-sm ${paymentResult.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                  {paymentResult.message}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCloseTransparentCheckout}
                  disabled={paymentInProgress}
                  className="px-6 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paymentInProgress}
                  className="px-6 py-2 font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-wait"
                >
                  {paymentInProgress ? <><i className="fas fa-spinner fa-spin mr-2"></i> Processando...</> : 'Confirmar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}