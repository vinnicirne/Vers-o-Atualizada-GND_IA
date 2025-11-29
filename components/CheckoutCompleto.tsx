'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext'; // Ajustado para o useUser existente
import { supabaseUrl } from '../services/supabaseClient'; // Para construir a URL da Edge Function

// Declaração global para o objeto MercadoPago SDK e Asaas SDK
declare global {
  interface Window {
    MercadoPago: any;
    Asaas: any;
  }
}

interface CheckoutCompletoProps {
  amount: number;
  itemType: 'plan' | 'credits';
  itemId: string; // planId ou um ID para o pacote de créditos (se for créditos, é a quantidade)
  mpPublicKey: string | null;
  asaasPublicKey: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export default function CheckoutCompleto({ amount, itemType, itemId, mpPublicKey, asaasPublicKey, onSuccess, onError, onCancel }: CheckoutCompletoProps) {
  const { user } = useUser();
  const [gateway, setGateway] = useState<'mp' | 'asaas'>(mpPublicKey ? 'mp' : 'asaas');
  const [loadingSdk, setLoadingSdk] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Refs para Mercado Pago
  const mpCardNumberRef = useRef<HTMLDivElement>(null);
  const mpExpirationDateRef = useRef<HTMLDivElement>(null);
  const mpSecurityCodeRef = useRef<HTMLDivElement>(null);
  const mpCardholderNameRef = useRef<HTMLDivElement>(null);
  const mpIssuerRef = useRef<HTMLSelectElement>(null);
  const mpInstallmentsRef = useRef<HTMLSelectElement>(null);

  // Inicializa o gateway preferencial se um deles estiver ativo
  useEffect(() => {
    if (mpPublicKey && !asaasPublicKey) {
      setGateway('mp');
    } else if (!mpPublicKey && asaasPublicKey) {
      setGateway('asaas');
    } else if (!mpPublicKey && !asaasPublicKey) {
      onError("Nenhum gateway de pagamento está habilitado ou configurado.");
      onCancel();
    }
  }, [mpPublicKey, asaasPublicKey, onError, onCancel]);

  // Carrega SDKs dinamicamente
  useEffect(() => {
    setLoadingSdk(true);
    let mpScript: HTMLScriptElement | null = null;
    let asaasScript: HTMLScriptElement | null = null;
    let cardForm: any = null; // Para armazenar a instância do cardForm do Mercado Pago

    const loadMpSdk = () => {
      return new Promise<void>((resolve, reject) => {
        if (!mpPublicKey || window.MercadoPago) {
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

    const loadAsaasSdk = () => {
      return new Promise<void>((resolve, reject) => {
        if (!asaasPublicKey || window.Asaas) {
          resolve();
          return;
        }
        asaasScript = document.createElement('script');
        asaasScript.src = "https://js.asaas.com/v1/asaas.js";
        asaasScript.onload = () => {
          (window as any).asaasReady = true;
          resolve();
        };
        asaasScript.onerror = () => reject(new Error("Falha ao carregar SDK do Asaas."));
        document.body.appendChild(asaasScript);
      });
    };

    Promise.all([
      mpPublicKey ? loadMpSdk() : Promise.resolve(),
      asaasPublicKey ? loadAsaasSdk() : Promise.resolve(),
    ]).then(() => {
      setLoadingSdk(false);
    }).catch(err => {
      setPaymentError(err.message);
      setLoadingSdk(false);
    });

    return () => {
      if (mpScript && document.body.contains(mpScript)) {
        document.body.removeChild(mpScript);
      }
      if (asaasScript && document.body.contains(asaasScript)) {
        document.body.removeChild(asaasScript);
      }
      if (cardForm && cardForm.unmount) {
        cardForm.unmount(); // Destruir instância do form MP
      }
    };
  }, [mpPublicKey, asaasPublicKey]);

  // Inicializa o formulário do Mercado Pago quando o SDK está pronto e o gateway é MP
  useEffect(() => {
    if (!mpPublicKey || gateway !== 'mp' || !window.MercadoPago || loadingSdk) {
      return;
    }

    const initMpForm = () => {
      const mp = new window.MercadoPago(mpPublicKey);

      const cardForm = mp.cardForm({
        amount: amount.toFixed(2).toString(),
        autoMount: true,
        form: {
          id: "form-mp", // Use um ID específico para MP
          cardNumber: { id: "form-mp__cardNumber" },
          expirationDate: { id: "form-mp__expirationDate" },
          securityCode: { id: "form-mp__securityCode" },
          cardholderName: { id: "form-mp__cardholderName" },
          issuer: { id: "form-mp__issuer" },
          installments: { id: "form-mp__installments" },
        },
        callbacks: {
          onReady: () => {
            console.log("Mercado Pago Form Ready!");
            setLoadingSdk(false); // SDK está pronto, o formulário pode ser exibido
          },
          onFormSubmitted: async (event: any) => {
            event.preventDefault();
            setProcessingPayment(true);
            setPaymentError(null);

            const { token, paymentMethodId, issuerId, installments } = cardForm.getCardFormData();

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
                  issuer_id: issuerId, // Passa issuerId para a função
                  installments: Number(installments), // Passa o número de parcelas
                  amount: amount,
                  user_id: user.id,
                  item_type: itemType,
                  item_id: itemId,
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
            setLoadingSdk(false);
          }
        },
      });
      return cardForm;
    };

    let mpFormInstance: any;
    if (gateway === 'mp' && window.MercadoPago) {
      mpFormInstance = initMpForm();
    }

    return () => {
      if (mpFormInstance && mpFormInstance.unmount) {
        mpFormInstance.unmount();
      }
    };
  }, [mpPublicKey, gateway, amount, user, itemType, itemId, onSuccess, onError, loadingSdk]);


  const handlePayment = async () => {
    if (!user) {
      onError("Por favor, faça login primeiro.");
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);

    if (gateway === 'mp') {
      // A submissão do formulário do Mercado Pago já é tratada pelo callback onFormSubmitted
      // Aciona a submissão programaticamente se o formulário estiver pronto
      const mpFormElement = document.getElementById('form-mp');
      if (mpFormElement) {
        mpFormElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      } else {
        onError("Formulário do Mercado Pago não encontrado ou não inicializado.");
        setProcessingPayment(false);
      }
    } else if (gateway === 'asaas') {
      if (!window.Asaas || !asaasPublicKey) {
        onError("SDK Asaas não carregado ou Public Key ausente.");
        setProcessingPayment(false);
        return;
      }

      // IMPORTANTE: Este é o código do usuário com dados de cartão FIXOS/MOCKADOS.
      // Para um checkout transparente real com Asaas, o usuário precisaria inserir
      // esses dados em campos de input e o token seria criado com base neles.
      try {
        const cardToken = await window.Asaas.createCreditCardToken({
          holderName: "CLIENTE TESTE",
          number: "4111111111111111", // Cartão de teste
          expiryMonth: "12",
          expiryYear: "2030",
          ccv: "123"
        });

        if (!cardToken || !cardToken.id) {
          onError("Falha ao gerar token do cartão Asaas.");
          setProcessingPayment(false);
          return;
        }

        const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/asaas-pagar`;

        const res = await fetch(supabaseFunctionUrl, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.id}`
          },
          body: JSON.stringify({
            amount: amount,
            user_id: user.id,
            cardToken: cardToken.id,
            item_type: itemType,
            item_id: itemId,
          }),
        });
        const result = await res.json();
        if (result.status === "CONFIRMED" || result.status === "PENDING") {
          onSuccess();
        } else {
          onError(result.errors?.[0]?.description || "Asaas: " + result.status);
        }
      } catch (error: any) {
        console.error("Erro ao chamar Edge Function asaas-pagar:", error);
        onError(error.message || "Falha na comunicação com o servidor de pagamento Asaas.");
      } finally {
        setProcessingPayment(false);
      }
    }
  };

  const hasMultipleGateways = !!mpPublicKey && !!asaasPublicKey;

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

      {hasMultipleGateways && (
        <div className="flex gap-4 mb-6">
          {mpPublicKey && (
            <button onClick={() => setGateway('mp')} className={`flex-1 py-3 rounded ${gateway === 'mp' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
              Mercado Pago
            </button>
          )}
          {asaasPublicKey && (
            <button onClick={() => setGateway('asaas')} className={`flex-1 py-3 rounded ${gateway === 'asaas' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
              Asaas
            </button>
          )}
        </div>
      )}

      {gateway === 'mp' && mpPublicKey && (
        <form id="form-mp" className="space-y-4">
          <div className="mt-4 p-2 text-xs text-yellow-400 bg-yellow-900/20 rounded border border-yellow-700/30 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Pagamento seguro via Mercado Pago.</span>
          </div>
          <div className="form-control">
            <label htmlFor="form-mp__cardNumber" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Número do Cartão</label>
            <div id="form-mp__cardNumber" ref={mpCardNumberRef} className="border-2 border-purple-900/60 p-3 rounded-md bg-black text-gray-200"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label htmlFor="form-mp__expirationDate" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Validade</label>
              <div id="form-mp__expirationDate" ref={mpExpirationDateRef} className="border-2 border-purple-900/60 p-3 rounded-md bg-black text-gray-200"></div>
            </div>
            <div className="form-control">
              <label htmlFor="form-mp__securityCode" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">CVC</label>
              <div id="form-mp__securityCode" ref={mpSecurityCodeRef} className="border-2 border-purple-900/60 p-3 rounded-md bg-black text-gray-200"></div>
            </div>
          </div>
          <div className="form-control">
            <label htmlFor="form-mp__cardholderName" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Nome no Cartão</label>
            <div id="form-mp__cardholderName" ref={mpCardholderNameRef} className="border-2 border-purple-900/60 p-3 rounded-md bg-black text-gray-200"></div>
          </div>
          <div className="form-control">
            <label htmlFor="form-mp__issuer" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Banco Emissor</label>
            <select id="form-mp__issuer" ref={mpIssuerRef} className="w-full bg-black border-2 border-purple-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></select>
          </div>
          <div className="form-control">
            <label htmlFor="form-mp__installments" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">Parcelas</label>
            <select id="form-mp__installments" ref={mpInstallmentsRef} className="w-full bg-black border-2 border-purple-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></select>
          </div>
        </form>
      )}

      {gateway === 'asaas' && asaasPublicKey && (
        <div className="space-y-4">
          <div className="mt-4 p-2 text-xs text-yellow-400 bg-yellow-900/20 rounded border border-yellow-700/30 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Pagamento seguro via Asaas. (Dados de cartão fixos para testes/demonstração).</span>
          </div>
          {/* Para Asaas, o código fornecido usa dados fixos. Se desejar inputs, precisaria adicionar aqui */}
          <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 text-sm text-gray-300">
            <p className="font-bold mb-2">Detalhes de Cartão (Dados Fixos - Apenas para Teste)</p>
            <p><strong>Titular:</strong> CLIENTE TESTE</p>
            <p><strong>Número:</strong> •••• •••• •••• 1111</p>
            <p><strong>Validade:</strong> 12/30</p>
            <p><strong>CVV:</strong> •••</p>
          </div>
        </div>
      )}

      <button onClick={handlePayment} className="mt-8 bg-black text-white w-full py-5 rounded-lg text-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-wait">
        {processingPayment ? (
          <><i className="fas fa-spinner fa-spin mr-2"></i> Processando...</>
        ) : (
          `PAGAR COM ${gateway === 'mp' ? 'MERCADO PAGO' : 'ASAAS'}`
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
