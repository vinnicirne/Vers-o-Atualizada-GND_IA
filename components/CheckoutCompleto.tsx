
import React, { useState, useEffect, useRef } from 'react';
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
  
  // Refs para manter os valores atuais sem disparar re-render do useEffect de inicialização
  const userRef = useRef(user);
  const itemTypeRef = useRef(itemType);
  const itemIdRef = useRef(itemId);

  // Atualiza refs quando props mudam
  useEffect(() => {
    userRef.current = user;
    itemTypeRef.current = itemType;
    itemIdRef.current = itemId;
  }, [user, itemType, itemId]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardFormRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (cardFormRef.current) {
        try {
          // Tenta desmontar limpo se o método existir
          if (typeof cardFormRef.current.unmount === 'function') {
             cardFormRef.current.unmount();
          }
        } catch (e) {}
      }
    };
  }, []);

  // Carrega SDK + inicializa CardForm
  useEffect(() => {
    if (!mpPublicKey) {
      setError('Chave do Mercado Pago não configurada.');
      setLoading(false);
      return;
    }

    const loadMercadoPago = async () => {
      // Se já carregou, inicializa direto
      if ((window as any).MercadoPago) {
        initializeCardForm();
        return;
      }

      // Carrega o script
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;

      script.onload = () => {
        if (mountedRef.current) initializeCardForm();
      };

      script.onerror = () => {
        if (mountedRef.current) {
          setError('Falha ao carregar Mercado Pago.');
          setLoading(false);
        }
      };

      document.body.appendChild(script);
    };

    const initializeCardForm = async () => {
      try {
        // Aguarda um pequeno tick para garantir que o DOM (os inputs) foram renderizados
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mountedRef.current) return;

        // Inicializa instância
        const mp = new (window as any).MercadoPago(mpPublicKey, {
          locale: 'pt-BR',
        });

        const cardForm = mp.cardForm({
          amount: amount.toString(),
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
            onFormMounted: (error: any) => {
              if (error) {
                console.warn('Erro no mount do MP:', error);
                return;
              }
              console.log('Formulário Mercado Pago montado com sucesso');
              if (mountedRef.current) setLoading(false);
            },
            onIssuersReceived: (error: any, issuers: any) => {
               if (error) return console.warn('Issuers error', error);
            },
            onInstallmentsReceived: (error: any, installments: any) => {
               if (error) return console.warn('Installments error', error);
            },
            onCardTokenReceived: (error: any, token: any) => {
                if (error) {
                    console.warn('Token receive error', error);
                    return;
                }
            },
            onSubmit: async (e: any) => {
              e.preventDefault();
              if (processing || !mountedRef.current) return;

              setProcessing(true);
              setError(null);

              try {
                // GERA O TOKEN PRIMEIRO (obrigatório!)
                const { token, error: tokenError } = await cardForm.createCardToken();

                if (tokenError || !token) {
                  const msg = tokenError?.[0]?.message || 'Verifique os dados do cartão.';
                  onError(msg);
                  setProcessing(false);
                  return;
                }

                // Agora pega os dados do form
                const formData = cardForm.getCardFormData();

                const { data: { session } } = await supabase.auth.getSession();

                // Usa REFs para pegar os dados mais atuais sem depender do closure do useEffect
                const currentItemType = itemTypeRef.current;
                const currentItemId = itemIdRef.current;
                const currentUserEmail = formData.cardholderEmail || userRef.current?.email;

                const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    token,
                    payment_method_id: formData.paymentMethodId,
                    issuer_id: formData.issuerId || null,
                    installments: Number(formData.installments) || 1,
                    amount: amount,
                    user_email: currentUserEmail,
                    item_type: currentItemType,
                    item_id: currentItemId,
                  }),
                });

                const result = await res.json();

                if (!res.ok || !['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || result.error || 'Pagamento não aprovado');
                }

                onSuccess();
              } catch (err: any) {
                console.error('Erro no pagamento:', err);
                onError(err.message || 'Erro ao processar pagamento');
              } finally {
                if (mountedRef.current) setProcessing(false);
              }
            },
          },
        });

        cardFormRef.current = cardForm;
        
      } catch (err) {
        console.error('Erro fatal no Mercado Pago:', err);
        if (mountedRef.current) {
          setError('Erro crítico no pagamento. Recarregue a página.');
          setLoading(false);
        }
      }
    };

    loadMercadoPago();
    // NÃO adicionar 'user' aqui para evitar re-montagem
  }, [mpPublicKey, amount]); 

  if (error) {
    return (
      <div className="p-6 bg-red-900/30 border border-red-600 rounded-xl text-center">
        <p className="text-red-200 text-center">{error}</p>
        <button onClick={onCancel} className="mt-4 w-full py-2 bg-red-700 hover:bg-red-600 rounded text-white">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="relative max-w-md mx-auto bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl">
      
      {/* Overlay de Loading enquanto o SDK carrega, mas mantendo o form no DOM */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-gray-950/90 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
            <i className="fas fa-spinner fa-spin text-4xl text-green-500 mb-4"></i>
            <p className="text-gray-400 text-sm">Iniciando pagamento seguro...</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fas fa-lock text-green-500"></i> Pagamento Seguro
          </h3>
          <p className="text-xs text-gray-500">Mercado Pago</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400">R$ {amount.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-500 hover:text-white"
        type="button"
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      <form id="form-checkout" className="space-y-4">
        <div className="space-y-2">
            <input
            type="text"
            id="form-checkout__cardNumber"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none transition-colors"
            placeholder="Número do cartão"
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            id="form-checkout__expirationDate"
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none"
            placeholder="MM/AA"
          />
          <input
            type="text"
            id="form-checkout__securityCode"
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none"
            placeholder="CVV"
          />
        </div>

        <input
          type="text"
          id="form-checkout__cardholderName"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none"
          placeholder="Nome no cartão"
        />

        <input
          type="email"
          id="form-checkout__cardholderEmail"
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-gray-400 focus:border-green-500 outline-none"
          defaultValue={userRef.current?.email || ''}
          placeholder="seu@email.com"
        />

        <div className="grid grid-cols-1 gap-4">
          <select
            id="form-checkout__issuer"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none"
          >
            <option value="" disabled selected>Banco emissor</option>
          </select>

          <select
            id="form-checkout__installments"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none"
          >
            <option value="" disabled selected>Parcelas</option>
          </select>
        </div>

        {/* Campos ocultos necessários para identificação em alguns casos, 
            embora a V2 simplificada geralmente deduza */}
        <div className="hidden">
            <select id="form-checkout__identificationType"></select>
            <input type="text" id="form-checkout__identificationNumber" />
        </div>

        <button
          type="submit"
          disabled={processing || loading}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-black font-bold rounded-lg text-lg transition shadow-lg disabled:cursor-not-allowed mt-4"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-3">
              <i className="fas fa-spinner fa-spin"></i> Processando...
            </span>
          ) : (
            'Pagar Agora'
          )}
        </button>
      </form>
    </div>
  );
}
