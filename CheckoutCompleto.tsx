import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

interface Props {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string;
  mpPublicKey: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

export default function CheckoutCompleto({
  amount,
  itemType,
  itemId,
  mpPublicKey,
  onSuccess,
  onError,
  onCancel,
}: Props) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const cardFormRef = useRef<any>(null);

  useEffect(() => {
    if (!mpPublicKey) {
      onError('Chave do Mercado Pago não configurada');
      setLoading(false);
      return;
    }

    // 1. Carrega o SDK só uma vez
    const scriptId = 'mp-sdk-v2';
    if (document.getElementById(scriptId)) {
      initWhenReady();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;

    script.onload = () => setTimeout(initWhenReady, 200); // ← 200ms é a mágica
    script.onerror = () => {
      onError('Erro ao carregar Mercado Pago');
      setLoading(false);
    };

    document.body.appendChild(script);

    // 2. Função que realmente inicializa o CardForm (só roda quando SDK 100% pronto)
    async function initWhenReady() {
      if (!window.MercadoPago) return setTimeout(initWhenReady, 100);

      try {
        // ESSA LINHA É OBRIGATÓRIA em 2025
        window.MercadoPago.setPublishableKey(mpPublicKey);

        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });

        // Limpa caso já exista
        cardFormRef.current?.unmount?.();

        const cardForm = mp.cardForm({
          amount: amount.toString(),
          autoMount: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular como no cartão' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) return console.warn(error);
              console.log('Formulário montado com sucesso!');

              // Preenche e-mail
              if (user?.email) {
                const el = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                if (el) el.value = user.email;
              }
            },
            onSubmit: async (e: Event) => {
              e.preventDefault();
              if (processing) return;
              setProcessing(true);

              try {
                // 1. Gera o token (obrigatório antes de tudo)
                const { token, error: tkError } = await cardForm.createCardToken();

                if (tkError || !token) {
                  onError(tkError?.[0]?.message || 'Cartão inválido');
                  return;
                }

                // 2. Pega os dados
                const data = cardForm.getCardFormData();

                const { data: { session } } = await supabase.auth.getSession();

                const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    token: token,
                    payment_method_id: data.paymentMethodId,
                    issuer_id: data.issuerId || null,
                    installments: Number(data.installments) || 1,
                    amount,
                    user_email: data.cardholderEmail || user?.email,
                    item_type: itemType,
                    item_id: itemId,
                  }),
                });

                const result = await res.json();

                if (!res.ok || !['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || result.error || 'Pagamento recusado');
                }

                onSuccess();
              } catch (err: any) {
                onError(err.message || 'Erro no pagamento');
              } finally {
                setProcessing(false);
              }
            },
          },
        });

        cardFormRef.current = cardForm;
        setLoading(false);
      } catch (err) {
        console.error(err);
        onError('Erro crítico no Mercado Pago. Recarregue a página.');
        setLoading(false);
      }
    }

    // Cleanup
    return () => {
      cardFormRef.current?.unmount?.();
    };
  }, [mpPublicKey, amount, user, itemType, itemId]);

  // UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <i className="fas fa-spinner fa-spin text-5xl text-green-500 mb-4"></i>
        <p className="text-gray-400">Carregando pagamento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-900 p-6 rounded-2xl border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-lock text-green-500"></i> Pagamento Seguro
          </h3>
          <p className="text-xs text-gray-500">Mercado Pago</p>
        </div>
        <div className="text-2xl font-bold text-green-400">
          R$ {amount.toFixed(2).replace('.', ',')}
        </div>
      </div>

      <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-white">
        <i className="fas fa-times text-2xl"></i>
      </button>

      <form id="form-checkout" className="space-y-4">
        <input type="text" id="form-checkout__cardNumber" className="input" placeholder="Número do cartão" />
        <div className="grid grid-cols-2 gap-4">
          <input type="text" id="form-checkout__expirationDate" className="input" placeholder="MM/AA" />
          <input type="text" id="form-checkout__securityCode" className="input" placeholder="CVV" />
        </div>
        <input type="text" id="form-checkout__cardholderName" className="input" placeholder="Nome no cartão" />
        <input type="email" id="form-checkout__cardholderEmail" className="input bg-gray-800" readOnly />

        <div className="grid grid-cols-2 gap-4">
          <select id="form-checkout__issuer" className="input"><option>Banco</option></select>
          <select id="form-checkout__installments" className="input"><option>Parcelas</option></select>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-black font-bold rounded-xl text-lg"
        >
          {processing ? 'Processando...' : 'Pagar Agora'}
        </button>
      </form>
    </div>
  );
}