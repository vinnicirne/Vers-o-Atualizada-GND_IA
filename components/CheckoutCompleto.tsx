// components/CheckoutFinal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';

interface Props {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string;
  mpPublicKey: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

export default function CheckoutFinal({
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

  // Referências para limpar tudo com segurança
  const mpInstance = useRef<any>(null);
  const cardFormInstance = useRef<any>(null);
  const scriptElement = useRef<HTMLScriptElement | null>(null);
  const isMounted = useRef(true); // Controla se o componente ainda está vivo

  useEffect(() => {
    isMounted.current = true;

    const loadMercadoPago = async () => {
      // Evita carregar duas vezes
      if (mpInstance.current || !isMounted.current) return;

      scriptElement.current = document.createElement('script');
      scriptElement.current.src = 'https://sdk.mercadopago.com/js/v2';
      scriptElement.current.async = true;

      scriptElement.current.onload = () => {
        if (!isMounted.current) return;

        const mp = new (window as any).MercadoPago(mpPublicKey, { locale: 'pt-BR' });
        mpInstance.current = mp;

        try {
          const cardForm = mp.cardForm({
            amount: amount.toString(),
            autoMount: true,
            form: {
              id: 'form-checkout',
              cardNumber: { id: 'form-checkout__cardNumber' },
              expirationDate: { id: 'form-checkout__expirationDate' },
              securityCode: { id: 'form-checkout__securityCode' },
              cardholderName: { id: 'form-checkout__cardholderName' },
              cardholderEmail: { id: 'form-checkout__cardholderEmail' },
              issuer: { id: 'form-checkout__issuer' },
              installments: { id: 'form-checkout__installments' },
            },
            callbacks: {
              onFormMounted: () => {
                if (!isMounted.current) return;
                console.log('Formulário Mercado Pago carregado!');
                setLoading(false);
                if (user?.email) {
                  const el = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                  if (el) el.value = user.email;
                }
              },
              onSubmit: async (e: any) => {
                e.preventDefault();
                if (!user || !isMounted.current) return;

                setProcessing(true);
                try {
                  const { token, paymentMethodId } = cardForm.getCardFormData();

                  const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token,
                      payment_method_id: paymentMethodId,
                      amount,
                      user_id: user.id,
                      item_type: itemType,
                      item_id: itemId,
                    }),
                  });

                  const data = await res.json();

                  if (data.status === 'approved' || data.status === 'pending') {
                    onSuccess();
                  } else {
                    onError(data.message || 'Pagamento recusado');
                  }
                } catch (err) {
                  onError('Erro ao processar');
                } finally {
                  if (isMounted.current) setProcessing(false);
                }
              },
            },
          });

          cardFormInstance.current = cardForm;
        } catch (err) {
          if (isMounted.current) {
            setLoading(false);
            onError('Erro ao iniciar pagamento');
          }
        }
      };

      scriptElement.current.onerror = () => {
        if (isMounted.current) {
          setLoading(false);
          onError('Falha ao carregar Mercado Pago');
        }
      };

      document.body.appendChild(scriptElement.current);
    };

    loadMercadoPago();

    // Cleanup TOTAL ao desmontar (ex: cancelar modal)
    return () => {
      isMounted.current = false;

      // Remove o form com segurança
      try {
        cardFormInstance.current?.unmount?.();
      } catch (e) {}

      // Remove o script
      if (scriptElement.current?.parentNode) {
        scriptElement.current.parentNode.removeChild(scriptElement.current);
      }

      mpInstance.current = null;
      cardFormInstance.current = null;
    };
  }, []); // <- executa só uma vez

  const pagar = () => {
    const form = document.getElementById('form-checkout');
    if (form && isMounted.current) {
      form.requestSubmit?.() || form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  };

  if (loading) {
    return (
      <div className="text-center p-12 bg-black/90 rounded-2xl">
        <div className="animate-spin h-12 w-12 border-4 border-green-500 rounded-full border-t-transparent mx-auto"></div>
        <p className="text-white mt-6 text-lg">Carregando pagamento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-black/90 p-8 rounded-2xl border border-green-500/30">
      <h2 className="text-4xl font-bold text-white text-center mb-8">
        R$ {amount.toFixed(2).replace('.', ',')}
      </h2>

      <form id="form-checkout" className="space-y-5">
        <input id="form-checkout__cardNumber" placeholder="Número do cartão" className="input" />
        <div className="grid grid-cols-2 gap-4">
          <input id="form-checkout__expirationDate" placeholder="MM/AA" className="input" />
          <input id="form-checkout__securityCode" placeholder="CVV" className="input" />
        </div>
        <input id="form-checkout__cardholderName" placeholder="Nome no cartão" className="input" />
        <input id="form-checkout__cardholderEmail" placeholder="E-mail" className="input" />
        <div id="form-checkout__issuer"></div>
        <div id="form-checkout__installments"></div>
      </form>

      <button
        onClick={pagar}
        disabled={processing}
        className="mt-8 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold text-xl py-5 rounded-xl hover:scale-105 disabled:opacity-60 transition"
      >
        {processing ? 'Processando...' : 'PAGAR COM CARTÃO'}
      </button>

      <button onClick={onCancel} className="mt-4 w-full text-gray-400 hover:text-white">
        Cancelar
      </button>
    </div>
  );
}

// Estilo único
const input = "w-full p-4 bg-gray-900/80 border border-purple-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 outline-none transition";