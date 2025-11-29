import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

interface CheckoutCompletoProps {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string;
  mpPublicKey: string | null;
  asaasPublicKey?: string | null; // Adicionado para compatibilidade de interface
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
          cardFormRef.current.unmount();
        } catch (e) {}
      }
    };
  }, []);

  // Carrega SDK + inicializa CardForm de forma 100% segura
  useEffect(() => {
    if (!mpPublicKey) {
      setError('Chave do Mercado Pago não configurada.');
      setLoading(false);
      return;
    }

    const loadMercadoPago = async () => {
      // Se já carregou, só inicializa
      if ((window as any).MercadoPago && (window as any).mpInstanceReady) {
        initializeCardForm();
        return;
      }

      // Carrega o script
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;

      script.onload = () => {
        (window as any).mpInstanceReady = true;
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
        // Inicializa instância
        const mp = new (window as any).MercadoPago(mpPublicKey, {
          locale: 'pt-BR',
        });

        // Limpa instância anterior (seguro)
        if (cardFormRef.current) {
          try {
             cardFormRef.current.unmount();
          } catch(e) { console.warn('Erro ao desmontar form anterior', e); }
          cardFormRef.current = null;
        }

        const cardForm = mp.cardForm({
          amount: amount.toString(),
          autoMount: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartão' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) {
                console.warn('Erro no mount:', error);
                return;
              }
              console.log('Formulário Mercado Pago montado com sucesso');

              // Preenche e-mail automaticamente usando REF para evitar dependência
              if (userRef.current?.email) {
                const el = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                if (el) el.value = userRef.current.email;
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
                  const msg = tokenError?.[0]?.message || 'Dados do cartão inválidos.';
                  onError(msg);
                  setProcessing(false); // Garante que libera o processamento
                  return;
                }

                // Agora pega os dados
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
        if (mountedRef.current) setLoading(false);
      } catch (err) {
        console.error('Erro fatal no Mercado Pago:', err);
        if (mountedRef.current) {
          setError('Erro crítico no pagamento. Recarregue a página.');
          setLoading(false);
        }
      }
    };

    loadMercadoPago();
    // DEPENDENCY ARRAY CRÍTICO: Não inclua 'user', 'itemType' ou 'itemId' aqui para evitar re-inits
  }, [mpPublicKey, amount]); 

  // UI de loading e erro
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-gray-900 rounded-xl">
        <i className="fas fa-spinner fa-spin text-4xl text-green-500 mb-4"></i>
        <p className="text-gray-400">Carregando pagamento seguro...</p>
      </div>
    );
  }

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
    <div className="max-w-md mx-auto bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl">
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
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      <form id="form-checkout" className="space-y-4">
        <input
          type="text"
          id="form-checkout__cardNumber"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 outline-none"
          placeholder="Número do cartão"
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            id="form-checkout__expirationDate"
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500"
            placeholder="MM/AA"
          />
          <input
            type="text"
            id="form-checkout__securityCode"
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500"
            placeholder="CVV"
          />
        </div>

        <input
          type="text"
          id="form-checkout__cardholderName"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500"
          placeholder="Nome no cartão"
        />

        <input
          type="email"
          id="form-checkout__cardholderEmail"
          className="w-full px-4 py-3 bg-gray-900/70 border border-gray-800 rounded-lg text-gray-400"
          readOnly={!!userRef.current?.email}
          defaultValue={userRef.current?.email || ''}
          placeholder="seu@email.com"
        />

        <div className="grid grid-cols-2 gap-4">
          <select
            id="form-checkout__issuer"
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="" disabled selected>Banco emissor</option>
          </select>

          <select
            id="form-checkout__installments"
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="" disabled selected>Parcelas</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-black font-bold rounded-lg text-lg transition shadow-lg disabled:cursor-not-allowed"
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