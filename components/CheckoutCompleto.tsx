'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

// Declaração global do SDK
declare global {
  interface Window {
    MercadoPago: any;
    mpReady?: boolean;
  }
}

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
  asaasPublicKey,
  onSuccess,
  onError,
  onCancel,
}: CheckoutCompletoProps) {
  const { user } = useUser();
  const [loadingSdk, setLoadingSdk] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const cardFormInstanceRef = useRef<any>(null);
  const formMounted = useRef(false);

  useEffect(() => {
    if (formMounted.current || !mpPublicKey) return;
    formMounted.current = true;
    setLoadingSdk(true);
    setPaymentError(null);

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;

    script.onload = () => {
      window.mpReady = true;

      const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });

      // Limpa instância anterior (importante no React 18 StrictMode)
      if (cardFormInstanceRef.current?.unmount) {
        cardFormInstanceRef.current.unmount();
      }

      const cardForm = mp.cardForm({
        amount: amount.toFixed(2),
        autoMount: true,
        form: {
          id: 'form-checkout',
          cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
          expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
          securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
          cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartão' },
          cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'E-mail' },
          issuer: { id: 'form-checkout__issuer' },
          installments: { id: 'form-checkout__installments' },
        },
        callbacks: {
          onFormMounted: () => {
            console.log('Mercado Pago Form Montado!');
            setLoadingSdk(false);

            // Preenche email automaticamente
            if (user?.email) {
              const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
              if (emailInput) emailInput.value = user.email;
            }
          },
          onSubmit: async (event: any) => {
            event.preventDefault();
            if (!user?.id) return onError('Faça login para continuar');

            setProcessingPayment(true);
            setPaymentError(null);

            try {
              const { token, paymentMethodId, issuerId, installment } = cardForm.getCardFormData();

              const response = await fetch(
                'https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token,
                    payment_method_id: paymentMethodId,
                    issuer_id: issuerId,
                    installments: installment,
                    amount,
                    user_id: user.id,
                    user_email: user.email,
                    item_type: itemType,
                    item_id: itemId,
                  }),
                }
              );

              const result = await response.json();

              if (result.status === 'approved' || result.status === 'pending') {
                onSuccess();
              } else {
                onError(result.message || `Pagamento ${result.status || 'recusado'}`);
              }
            } catch (err: any) {
              onError(err.message || 'Erro ao processar pagamento');
            } finally {
              setProcessingPayment(false);
            }
          },
        },
      });

      cardFormInstanceRef.current = cardForm;
    };

    script.onerror = () => {
      setPaymentError('Falha ao carregar SDK do Mercado Pago');
      setLoadingSdk(false);
    };

    document.body.appendChild(script);

    return () => {
      if (cardFormInstanceRef.current?.unmount) {
        cardFormInstanceRef.current.unmount();
      }
      if (script.parentNode) script.parentNode.removeChild(script);
      formMounted.current = false;
    };
  }, [mpPublicKey, amount, user, itemType, itemId, onSuccess, onError]);

  const handlePayment = () => {
    const form = document.getElementById('form-checkout');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  if (loadingSdk) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-black/90 rounded-xl">
        <i className="fas fa-spinner fa-spin text-5xl text-green-500 mb-4"></i>
        <p className="text-xl text-white font-bold">Carregando pagamento seguro...</p>
        <button onClick={onCancel} className="mt-6 px-6 py-3 bg-gray-700 text-white rounded-lg">
          Cancelar
        </button>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="p-10 bg-red-900/30 border border-red-500 rounded-xl text-center">
        <p className="text-5xl mb-4">Warning</p>
        <p className="text-red-400 font-bold text-lg">Erro de Pagamento</p>
        <p className="text-sm mt-2 text-gray-300">{paymentError}</p>
        <button onClick={onCancel} className="mt-6 px-6 py-3 bg-gray-700 text-white rounded-lg">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-black/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-green-500/30">
      <h2 className="text-3xl font-bold text-center text-white mb-2">
        R$ {amount.toFixed(2).replace('.', ',')}
      </h2>
      <p className="text-center text-gray-400 text-sm mb-8">
        {itemType === 'plan' ? `Plano ${itemId}` : `${itemId} créditos`}
      </p>

      <form id="form-checkout" className="space-y-5">
        <input
          type="text"
          id="form-checkout__cardNumber"
          className="w-full bg-gray-900 border border-purple-800 p-4 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          placeholder="Número do cartão"
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            id="form-checkout__expirationDate"
            className="bg-gray-900 border border-purple-800 p-4 rounded-lg text-white placeholder-gray-500"
            placeholder="MM/AA"
          />
          <input
            type="text"
            id="form-checkout__securityCode"
            className="bg-gray-900 border border-purple-800 p-4 rounded-lg text-white placeholder-gray-500"
            placeholder="CVV"
          />
        </div>

        <input
          type="text"
          id="form-checkout__cardholderName"
          className="w-full bg-gray-900 border border-purple-800 p-4 rounded-lg text-white placeholder-gray-500"
          placeholder="Nome no cartão"
        />

        <input
          type="email"
          id="form-checkout__cardholderEmail"
          className="w-full bg-gray-900 border border-purple-800 p-4 rounded-lg text-white placeholder-gray-500"
          placeholder="E-mail"
        />

        {/* OBRIGATÓRIO: divs vazias para o SDK injetar */}
        <div id="form-checkout__issuer"></div>
        <div id="form-checkout__installments"></div>
      </form>

      <button
        onClick={handlePayment}
        disabled={processingPayment}
        className="mt-8 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold text-xl py-5 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all"
      >
        {processingPayment ? (
          <>Processando...</>
        ) : (
          'PAGAR COM CARTÃO'
        )}
      </button>

      <button
        onClick={onCancel}
        disabled={processingPayment}
        className="mt-4 w-full py-3 text-gray-400 hover:text-white transition"
      >
        Cancelar
      </button>
    </div>
  );
}