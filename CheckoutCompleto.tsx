import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

interface Props {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string;
  mpPublicKey: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

export default function CheckoutTransparente({
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
  const mpRef = useRef<any>(null);
  const cardFormRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Carregar SDK se não estiver presente
        if (!window.MercadoPago) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Falha ao carregar SDK'));
            document.body.appendChild(script);
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        // Instância Mercado Pago
        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
        mpRef.current = mp;

        // CardForm
        const cardForm = mp.cardForm({
          amount: amount.toString(),
          autoMount: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Nome no cartão' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) {
                console.error(error);
                if (mounted) onError('Erro ao montar formulário');
                return;
              }
              if (user?.email) {
                const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                if (emailInput) emailInput.value = user.email;
              }
              setLoading(false);
            },
            onBinChange: async (bin: string) => {
              if (bin.length >= 6) {
                try {
                  const installments = await mpRef.current.getInstallments({
                    amount: amount.toString(),
                    bin,
                  });
                  console.log('Parcelas:', installments);
                } catch (err) {
                  console.error('Erro ao buscar parcelas:', err);
                }
              }
            },
            onSubmit: async (event: Event) => {
              event.preventDefault();
              if (processing) return;
              setProcessing(true);

              try {
                const { token, error: tokenError } = await cardFormRef.current.createCardToken();
                if (tokenError || !token) throw new Error(tokenError?.[0]?.message || 'Erro ao gerar token');

                const formData = cardFormRef.current.getCardFormData();
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Usuário não autenticado');

                const response = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    token,
                    payment_method_id: formData.paymentMethodId,
                    issuer_id: formData.issuerId || null,
                    installments: Number(formData.installments) || 1,
                    amount,
                    user_email: formData.cardholderEmail || user?.email,
                    item_type: itemType,
                    item_id: itemId,
                  }),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || result.error || 'Erro no pagamento');
                if (!['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || 'Pagamento não aprovado');
                }

                onSuccess();
              } catch (err: any) {
                console.error(err);
                onError(err.message || 'Erro no pagamento');
              } finally {
                setProcessing(false);
              }
            },
          },
        });

        cardFormRef.current = cardForm;
      } catch (err: any) {
        console.error(err);
        if (mounted) onError(err.message || 'Erro ao inicializar checkout');
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (cardFormRef.current) cardFormRef.current.unmount();
    };
  }, [mpPublicKey, amount]);

  if (loading) {
    return <p>Carregando checkout...</p>;
  }

  return (
    <div className="max-w-md mx-auto bg-gray-900 p-6 rounded-2xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Pagamento Seguro</h3>
      <form id="form-checkout" className="space-y-4">
        <input id="form-checkout__cardNumber" className="input" placeholder="Número do cartão" />
        <div className="grid grid-cols-2 gap-4">
          <input id="form-checkout__expirationDate" className="input" placeholder="MM/AA" />
          <input id="form-checkout__securityCode" className="input" placeholder="CVV" />
        </div>
        <input id="form-checkout__cardholderName" className="input" placeholder="Nome no cartão" />
        <input id="form-checkout__cardholderEmail" className="input bg-gray-800" readOnly />
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
      <button onClick={onCancel} className="mt-4 text-gray-400 hover:text-white">Cancelar</button>
    </div>
  );
}
