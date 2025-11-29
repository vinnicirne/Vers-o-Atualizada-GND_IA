'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext'; // Ajustado para o useUser existente
import { supabaseUrl } from '../services/supabaseClient'; // Para construir a URL da Edge Function

// Declaração global para o objeto MercadoPago SDK
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CheckoutCompletoProps {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string; // planId ou um ID para o pacote de créditos (se for créditos, é a quantidade)
  mpPublicKey: string | null;
  asaasPublicKey: string | null; // Keep prop, but won't be used
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export default function CheckoutCompleto({ amount, itemType, itemId, mpPublicKey, asaasPublicKey, onSuccess, onError, onCancel }: CheckoutCompletoProps) {
  const { user } = useUser();
  const [loadingSdk, setLoadingSdk] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Ref to hold the MercadoPago CardForm instance
  const cardFormInstanceRef = useRef<any>(null);

  // Load Mercado Pago SDK dynamically and initialize form
  useEffect(() => {
    setLoadingSdk(true);
    let mpScript: HTMLScriptElement | null = null;
    let cleanupMpForm: (() => void) | null = null;

    const loadMpSdk = () => {
      return new Promise<void>((resolve, reject) => {
        if (!mpPublicKey) { // No public key, so no MP.
          resolve();
          return;
        }
        if (window.MercadoPago) {
          resolve();
          return;
        }
        mpScript = document.createElement('script');
        mpScript.src = "https://sdk.mercadopago.com/js/v2";
        mpScript.onload = () => {
          (window as any).mpReady = true;
          resolve();
        };
        mpScript.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago."));
        document.body.appendChild(mpScript);
      });
    };

    loadMpSdk().then(() => {
      if (mpPublicKey && window.MercadoPago) {
        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });

        // Unmount any previous form instance before creating a new one
        if (cardFormInstanceRef.current && typeof cardFormInstanceRef.current.unmount === 'function') {
            cardFormInstanceRef.current.unmount();
        }

        const newCardForm = mp.cardForm({
          amount: amount.toFixed(2).toString(),
          form: {
            id: "form-checkout", // This ID is for the HTML form wrapper
            cardNumber: { id: "form-checkout__cardNumber", placeholder: "Número do cartão" },
            expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/AA" },
            securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
            cardholderName: { id: "form-checkout__cardholderName", placeholder: "Titular do cartão" },
            cardholderEmail: { id: "form-checkout__cardholderEmail", placeholder: "E-mail" },
            issuer: { id: "form-checkout__issuer" }, // Removed placeholder
            installments: { id: "form-checkout__installments" }, // Removed placeholder
          },
          callbacks: {
            onFormMounted: () => {
              console.log("Mercado Pago Form Mounted!");
              setLoadingSdk(false);
              // Set default email if user is logged in
              if (user?.email) {
                  const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                  if (emailInput) emailInput.value = user.email;
              }
            },
            onSubmit: async (event: any) => {
              event.preventDefault();
              setProcessingPayment(true);
              setPaymentError(null);

              const { token, paymentMethodId, issuerId, installments, cardholderEmail } = newCardForm.getCardFormData();

              if (!user?.id) {
                onError("Usuário não autenticado. Por favor, faça login.");
                setProcessingPayment(false);
                return;
              }

              const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/mp-pagar`;

              try {
                const res = await fetch(supabaseFunctionUrl, {
                  method: "POST",
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.id}` // Passa o UID do usuário para a Edge Function
                  },
                  body: JSON.stringify({
                    token,
                    payment_method_id: paymentMethodId,
                    issuer_id: issuerId,
                    installments: Number(installments),
                    amount: amount,
                    user_id: user.id, // For logging in Edge Function
                    user_email: cardholderEmail || user.email, // Use cardholderEmail from form, fallback to user.email
                    item_type: item_type,
                    item_id: item_id,
                  }),
                });

                const result = await res.json();
                if (result.status === "approved" || result.status === "pending") {
                  onSuccess(); // Sucesso, o pai lida com a atualização do usuário
                } else {
                  onError(result.message || "Pagamento: " + result.status);
                }
              } catch (error: any) {
                console.error("Erro ao chamar Edge Function mp-pagar:", error);
                onError(error.message || "Falha na comunicação com o servidor de pagamento.");
              } finally {
                setProcessingPayment(false);
              }
            },
            onError: (errors: any) => {
              console.error("Erro do SDK Mercado Pago:", errors);
              const errorMessage = errors[0]?.message || "Erro ao carregar o formulário de pagamento.";
              setPaymentError(errorMessage);
            }
          },
        });
        cardFormInstanceRef.current = newCardForm; // Store the instance
        cleanupMpForm = () => {
            if (newCardForm && typeof newCardForm.unmount === 'function') {
                newCardForm.unmount();
            }
        };
      } else {
        setLoadingSdk(false);
        if (!mpPublicKey) {
            setPaymentError("Gateway de pagamento Mercado Pago não está habilitado ou configurado.");
        } else {
            setPaymentError("SDK do Mercado Pago não carregou corretamente.");
        }
      }
    }).catch(err => {
      setPaymentError(err.message);
      setLoadingSdk(false);
    });

    return () => {
      if (mpScript && document.body.contains(mpScript)) {
        document.body.removeChild(mpScript);
      }
      if (cleanupMpForm) {
        cleanupMpForm();
      }
    };
  }, [mpPublicKey, amount, user, itemType, itemId, onSuccess, onError]); // Re-run when these change

  const handlePayment = () => {
    if (!user) {
      onError("Por favor, faça login primeiro.");
      return;
    }
    if (!cardFormInstanceRef.current) {
        onError("Formulário de pagamento não está pronto. Tente novamente.");
        return;
    }

    setProcessingPayment(true);
    setPaymentError(null);

    // Trigger the form submission which is handled by Mercado Pago's onSubmit callback
    const mpFormElement = document.getElementById('form-checkout');
    if (mpFormElement) {
        mpFormElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    } else {
        onError("Formulário do Mercado Pago não encontrado ou não inicializado.");
        setProcessingPayment(false);
    }
  };

  if (loadingSdk) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-black/80 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <i className="fas fa-spinner fa-spin text-4xl text-green-400 mb-4"></i>
        <p className="text-lg font-bold text-white">Carregando SDKs de Pagamento...</p>
        {paymentError && <p className="mt-2 text-red-400 text-sm">{paymentError}</p>}
        <button onClick={onCancel} className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
          Fechar
        </button>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-red-400 bg-black/80 rounded-lg shadow-xl w-full max-w-md border border-red-500/50">
        <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p className="text-lg font-bold">Erro de Pagamento</p>
        <p className="mt-2 text-sm">{paymentError}</p>
        <button onClick={onCancel} className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-black/80 backdrop-blur-md p-10 rounded-xl shadow-lg border border-green-500/30">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">Checkout - R$ {amount.toFixed(2).replace('.', ',')}</h2>
      <p className="text-sm text-gray-400 text-center mb-6">
        Item: <span className="font-bold">{itemType === 'plan' ? `Plano ${itemId}` : `${itemId} Créditos`}</span>
      </p>

      {/* Mercado Pago Section */}
      {mpPublicKey && (
        <form id="form-checkout" className="space-y-4">
          <div className="mt-4 p-2 text-xs text-yellow-400 bg-yellow-900/20 rounded border border-yellow-700/30 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Pagamento seguro via Mercado Pago.</span>
          </div>
          <div className="form-control">
            <label htmlFor="form-checkout__cardNumber" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Número do Cartão</label>
            <input type="text" id="form-checkout__cardNumber" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0" placeholder="Número do cartão" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label htmlFor="form-checkout__expirationDate" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Validade</label>
              <input type="text" id="form-checkout__expirationDate" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0" placeholder="MM/AA" />
            </div>
            <div className="form-control">
              <label htmlFor="form-checkout__securityCode" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">CVC</label>
              <input type="text" id="form-checkout__securityCode" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0" placeholder="CVV" />
            </div>
          </div>
          <div className="form-control">
            <label htmlFor="form-checkout__cardholderName" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Nome no Cartão</label>
            <input type="text" id="form-checkout__cardholderName" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0" placeholder="Titular do cartão" />
          </div>
          <div className="form-control">
            <label htmlFor="form-checkout__cardholderEmail" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">E-mail</label>
            <input type="email" id="form-checkout__cardholderEmail" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0" placeholder="E-mail" />
          </div>
          <div className="form-control">
            <label htmlFor="form-checkout__issuer" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Banco Emissor</label>
            {/* FIX: Removed placeholder from <select> element */}
            <select id="form-checkout__issuer" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0">
                <option value="" disabled selected>Selecione o banco emissor</option>
            </select>
          </div>
          <div className="form-control">
            <label htmlFor="form-checkout__installments" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Parcelas</label>
            {/* FIX: Removed placeholder from <select> element */}
            <select id="form-checkout__installments" className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0">
                <option value="" disabled selected>Selecione as parcelas</option>
            </select>
          </div>
        </form>
      )}

      <button onClick={handlePayment} className="mt-8 bg-black text-white w-full py-5 rounded-lg text-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-wait">
        {processingPayment ? (
          <><i className="fas fa-spinner fa-spin mr-2"></i> Processando...</>
        ) : (
          `PAGAR COM MERCADO PAGO`
        )}
      </button>
      <button 
        onClick={onCancel} 
        className="mt-4 w-full py-3 bg-transparent hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition"
        disabled={processingPayment}
      >
        Cancelar
      </button>
    </div>
  );
}