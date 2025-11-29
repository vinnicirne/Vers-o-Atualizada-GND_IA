'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CheckoutCompletoProps {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string;
  mpPublicKey: string | null;
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const cardFormRef = useRef<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Evita executar duas vezes no StrictMode
    if (initialized.current || !mpPublicKey) return;
    initialized.current = true;

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;

    script.onload = () => {
      const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });

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
            console.log('Formulário Mercado Pago montado com sucesso!');
            setLoading(false);
            if (user?.email) {
              const emailField = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
              if (emailField) emailField.value = user.email;
            }
          },
          onSubmit: async (e: any) => {
            e.preventDefault();
            if (!user?.id) return onError('Faça login primeiro');

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
                  description: `${itemType} - ${itemId}`,
                }),
              });

              const data = await res.json();

              if (data.status === 'approved' || data.status === 'pending') {
                onSuccess();
              } else {
                onError(data.message || `Pagamento ${data.status}`);
              }
            } catch (err) {
              onError('Erro ao processar pagamento');
            } finally {
              setProcessing(false);
            }
          },
        },
      });

      cardFormRef.current = cardForm;
    };

    document.body.appendChild(script);

    return () => {
      if (cardFormRef.current?.unmount) {
        cardFormRef.current.unmount();
      }
      initialized.current = false;
    };
  }, [mpPublicKey, amount, user, itemType, itemId, onSuccess, onError]);

  const pagar = () => {
    const form = document.getElementById('form-checkout');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  if (loading) {
    return (
      <div className="text-center p-10 bg-black/90 rounded-xl">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-green-500"></div>
        <p className="mt-4 text-white text-xl">Carregando pagamento seguro...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-purple-900 to-black p-8 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold text-white text-center mb-6">
        R$ {amount.toFixed(2).replace('.', ',')}
      </h2>

      <form id="form-checkout" className="space-y-4">
        <input id="form-checkout__cardNumber" placeholder="Número do cartão" className="w-full p-4 bg-gray-900 text-white rounded-lg border border-purple-700 focus:border-purple-500 outline-none" />
        <div className="grid grid-cols-2 gap-4">
          <input id="form-checkout__expirationDate" placeholder="MM/AA" className="p-4 bg-gray-900 text-white rounded-lg border border-purple-700" />
          <input id="form-checkout__securityCode" placeholder="CVV" className="p-4 bg-gray-900 text-white rounded-lg border border-purple-700" />
        </div>
        <input id="form-checkout__cardholderName" placeholder="Nome no cartão" className="w-full p-4 bg-gray-900 text-white rounded-lg border border-purple-700" />
        <input id="form-checkout__cardholderEmail" placeholder="E-mail" className="w-full p-4 bg-gray-900 text-white rounded-lg border border-purple-700" />

        {/* DIVS VAZIAS OBRIGATÓRIAS */}
        <div id="form-checkout__issuer"></div>
        <div id="form-checkout__installments"></div>
      </form>

      <button
        onClick={pagar}
        disabled={processing}
        className="mt-8 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold text-xl py-5 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 transition-all"
      >
        {processing ? 'Processando...' : 'PAGAR COM CARTÃO'}
      </button>

      <button onClick={onCancel} className="mt-4 w-full text-gray-400 hover:text-white transition">
        Cancelar
      </button>
    </div>
  );
}