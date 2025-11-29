import React, { useState, useEffect, useRef, memo } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

interface CheckoutCompletoProps {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string;
  mpPublicKey: string | null;
  asaasPublicKey?: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

// --- STATIC INPUTS COMPONENT ---
// Este componente é memoizado com uma função de comparação que sempre retorna true.
// Isso impede que o React atualize este trecho do DOM, protegendo os iFrames do Mercado Pago
// de serem destruídos por re-renderizações do componente pai.
const StaticMPFormFields = memo(({ userEmail }: { userEmail: string }) => {
  return (
    <>
      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Número do Cartão</label>
          <div className="h-12 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden relative">
             <input
              type="text"
              id="form-checkout__cardNumber"
              className="w-full h-full px-4 bg-transparent text-white placeholder-gray-600 focus:outline-none"
              placeholder=""
              />
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Validade</label>
           <div className="h-12 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              <input
                  type="text"
                  id="form-checkout__expirationDate"
                  className="w-full h-full px-4 bg-transparent text-white placeholder-gray-600 focus:outline-none"
                  placeholder="MM/AA"
              />
           </div>
        </div>
        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">CVV</label>
           <div className="h-12 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              <input
                  type="text"
                  id="form-checkout__securityCode"
                  className="w-full h-full px-4 bg-transparent text-white placeholder-gray-600 focus:outline-none"
                  placeholder="123"
              />
           </div>
        </div>
      </div>

      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nome no Cartão</label>
          <div className="h-12 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              <input
              type="text"
              id="form-checkout__cardholderName"
              className="w-full h-full px-4 bg-transparent text-white placeholder-gray-600 focus:outline-none"
              />
          </div>
      </div>

      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">E-mail</label>
          <div className="h-12 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              <input
              type="email"
              id="form-checkout__cardholderEmail"
              className="w-full h-full px-4 bg-transparent text-white placeholder-gray-600 focus:outline-none"
              defaultValue={userEmail}
              />
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Banco Emissor</label>
           <select
              id="form-checkout__issuer"
              className="w-full h-12 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none appearance-none cursor-pointer"
           ></select>
        </div>

        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Parcelamento</label>
           <select
              id="form-checkout__installments"
              className="w-full h-12 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none appearance-none cursor-pointer"
           ></select>
        </div>
      </div>

      <div className="hidden">
          <select id="form-checkout__identificationType"></select>
          <input type="text" id="form-checkout__identificationNumber" />
      </div>
    </>
  );
}, () => true); // COMPARAÇÃO ESTÁTICA: Retorna sempre true para evitar re-render

export default function CheckoutCompleto({
  amount,
  itemType,
  itemId,
  mpPublicKey,
  onSuccess,
  onError,
  onCancel,
}: CheckoutCompletoProps) {
  const { user } = useUser();
  
  // Refs para valores que não devem triggar re-init do MP
  const amountRef = useRef(amount);
  const userRef = useRef(user);
  const itemTypeRef = useRef(itemType);
  const itemIdRef = useRef(itemId);

  useEffect(() => {
    amountRef.current = amount;
    userRef.current = user;
    itemTypeRef.current = itemType;
    itemIdRef.current = itemId;
  }, [amount, user, itemType, itemId]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardFormRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cardFormRef.current) {
        try {
          if (typeof cardFormRef.current.unmount === 'function') {
             cardFormRef.current.unmount();
          }
        } catch (e) {
          console.warn('Error unmounting MP form:', e);
        }
        cardFormRef.current = null;
      }
    };
  }, []);

  // Initialize Mercado Pago
  useEffect(() => {
    if (!mpPublicKey) {
      setError('Chave do Mercado Pago não configurada.');
      setLoading(false);
      return;
    }

    const initializeCardForm = async () => {
      if (cardFormRef.current) return; // Prevent double init

      try {
        // Aguarda um pequeno tick para garantir que o DOM (o formulário) foi renderizado pelo React
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mountedRef.current) return;

        // @ts-ignore
        const mp = new window.MercadoPago(mpPublicKey, {
          locale: 'pt-BR',
        });

        const cardForm = mp.cardForm({
          amount: amountRef.current.toString(),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartão' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
            identificationType: { id: 'form-checkout__identificationType' },
            identificationNumber: { id: 'form-checkout__identificationNumber' },
          },
          callbacks: {
            onFormMounted: (err: any) => {
              if (err) {
                console.warn('MP Mount Error:', err);
                return;
              }
              if (mountedRef.current) {
                  console.log('MP Form Mounted Successfully');
                  setLoading(false);
              }
            },
            onIssuersReceived: (err: any, issuers: any) => {
               if (err) console.warn('Issuers error', err);
            },
            onInstallmentsReceived: (err: any, installments: any) => {
               if (err) console.warn('Installments error', err);
            },
            onCardTokenReceived: (err: any, token: any) => {
                if (err) console.warn('Token error', err);
            },
            onSubmit: async (e: any) => {
              // O SDK do Mercado Pago chama isso automaticamente no submit do form
              e.preventDefault();
              if (processing || !mountedRef.current) return;

              setProcessing(true);
              setError(null);

              try {
                // 1. Create Token
                const { token, error: tokenError } = await cardForm.createCardToken();

                if (tokenError || !token) {
                  console.error("Token Error:", tokenError);
                  throw new Error('Verifique os dados do cartão.');
                }

                // 2. Get Form Data
                const formData = cardForm.getCardFormData();
                const { data: { session } } = await supabase.auth.getSession();

                // 3. Send to Backend
                const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    token,
                    payment_method_id: formData.paymentMethodId,
                    issuer_id: formData.issuerId,
                    installments: Number(formData.installments),
                    amount: amountRef.current,
                    user_email: formData.cardholderEmail || userRef.current?.email,
                    item_type: itemTypeRef.current,
                    item_id: itemIdRef.current,
                  }),
                });

                const result = await res.json();

                if (!res.ok || !['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || result.error || 'Pagamento não aprovado');
                }

                onSuccess();
              } catch (err: any) {
                console.error('Payment Error:', err);
                onError(err.message || 'Erro ao processar pagamento.');
              } finally {
                if (mountedRef.current) setProcessing(false);
              }
            },
          },
        });

        cardFormRef.current = cardForm;
        
      } catch (err) {
        console.error('Fatal MP Error:', err);
        if (mountedRef.current) {
          setError('Erro ao carregar o formulário. Recarregue a página.');
          setLoading(false);
        }
      }
    };

    const loadMercadoPago = async () => {
      // @ts-ignore
      if (window.MercadoPago) {
        initializeCardForm();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => {
        if (mountedRef.current) initializeCardForm();
      };
      script.onerror = () => {
        if (mountedRef.current) {
          setError('Falha ao carregar sistema de pagamento.');
          setLoading(false);
        }
      };
      document.body.appendChild(script);
    };

    loadMercadoPago();
  }, [mpPublicKey]); 

  // Se houver erro crítico na inicialização
  if (error && !loading && !processing) {
    return (
      <div className="relative max-w-md mx-auto bg-gray-950 p-6 rounded-2xl border border-red-900 shadow-2xl text-center">
        <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-2"></i>
        <p className="text-red-200 mb-4">{error}</p>
        <button onClick={onCancel} className="px-6 py-2 bg-red-700 hover:bg-red-600 rounded text-white font-bold transition">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="relative max-w-md mx-auto bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl">
      
      {/* LOADING OVERLAY */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-gray-950/95 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm transition-opacity">
            <i className="fas fa-circle-notch fa-spin text-4xl text-green-500 mb-4"></i>
            <p className="text-gray-400 text-sm font-medium animate-pulse">Conectando ao banco seguro...</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fas fa-lock text-green-500"></i> Pagamento Seguro
          </h3>
          <p className="text-xs text-gray-500">Processado via Mercado Pago</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400">R$ {amount.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
        type="button"
      >
        <i className="fas fa-times text-lg"></i>
      </button>

      {/* FORMULÁRIO MERCADO PAGO */}
      <form id="form-checkout" className="space-y-4">
        
        {/* Componente Estático Memoizado: React NÃO tocará aqui após o mount */}
        <StaticMPFormFields userEmail={userRef.current?.email || ''} />

        <button
          type="submit"
          disabled={processing || loading}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-green-900/20 transform active:scale-[0.98] mt-6"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-3">
              <i className="fas fa-circle-notch fa-spin"></i> Processando...
            </span>
          ) : (
            'Pagar Agora'
          )}
        </button>
      </form>
    </div>
  );
}