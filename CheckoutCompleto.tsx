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
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Carregar SDK do Mercado Pago
  useEffect(() => {
    if (!mpPublicKey) {
      onError('Chave pública do Mercado Pago não configurada');
      setLoading(false);
      return;
    }

    const scriptId = 'mercado-pago-sdk';
    
    // Verifica se o script já existe
    if (document.getElementById(scriptId)) {
      setSdkLoaded(true);
      return;
    }

    // Carrega o SDK
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    
    script.onload = () => {
      console.log('Mercado Pago SDK carregado com sucesso');
      setSdkLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Erro ao carregar Mercado Pago SDK');
      onError('Erro ao carregar sistema de pagamento');
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Não remove o script para evitar recarregar múltiplas vezes
    };
  }, [mpPublicKey, onError]);

  // Inicializar o formulário de cartão quando o SDK estiver carregado
  useEffect(() => {
    if (!sdkLoaded || !mpPublicKey || !window.MercadoPago) {
      return;
    }

    const initializeCardForm = async () => {
      try {
        console.log('CheckoutCompleto: Initializing with amount:', amount);
        
        // Limpa formulário anterior se existir
        if (cardFormRef.current) {
          cardFormRef.current.unmount();
          cardFormRef.current = null;
        }

        // Inicializa o Mercado Pago
        const mp = new window.MercadoPago(mpPublicKey, {
          locale: 'pt-BR'
        });

        // Configura o formulário de cartão
        const cardForm = mp.cardForm({
          amount: amount.toString(),
          autoMount: true,
          form: {
            id: 'form-checkout',
            cardNumber: {
              id: 'form-checkout__cardNumber',
              placeholder: 'Número do cartão',
            },
            expirationDate: {
              id: 'form-checkout__expirationDate',
              placeholder: 'MM/AA',
            },
            securityCode: {
              id: 'form-checkout__securityCode',
              placeholder: 'CVV',
            },
            cardholderName: {
              id: 'form-checkout__cardholderName',
              placeholder: 'Titular como no cartão',
            },
            cardholderEmail: {
              id: 'form-checkout__cardholderEmail',
            },
            issuer: {
              id: 'form-checkout__issuer',
            },
            installments: {
              id: 'form-checkout__installments',
            },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) {
                console.error('Erro ao montar formulário:', error);
                onError('Erro ao configurar formulário de pagamento');
                return;
              }
              
              console.log('Mercado Pago Form Mounted!');
              
              // Preenche e-mail automaticamente
              if (user?.email) {
                setTimeout(() => {
                  const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                  if (emailInput) {
                    emailInput.value = user.email;
                    console.log('E-mail preenchido automaticamente:', user.email);
                  }
                }, 100);
              }
            },

            onFormUnmounted: (error: any) => {
              console.log('Mercado Pago Form Unmounted!', error);
            },

            onInstallmentsReceived: (error: any, installments: any) => {
              if (error) {
                console.warn('Mercado Pago: Installments Received (direct)', error);
                return;
              }
              console.log('Mercado Pago: Installments Received (direct)', installments);
            },

            onSubmit: async (event: Event) => {
              event.preventDefault();
              
              if (processing) return;
              
              console.log('Iniciando processamento do pagamento...');
              setProcessing(true);

              try {
                // Gera o token do cartão
                const { token, error: tokenError } = await cardForm.createCardToken();
                
                console.log('Token gerado:', token ? 'Sim' : 'Não');
                console.log('Erro no token:', tokenError);

                if (tokenError || !token) {
                  const errorMessage = tokenError?.[0]?.message || 'Erro ao processar cartão. Verifique os dados.';
                  console.error('Erro na geração do token:', errorMessage);
                  onError(errorMessage);
                  setProcessing(false);
                  return;
                }

                // Obtém dados do formulário
                const formData = cardForm.getCardFormData();
                console.log('Dados do formulário:', formData);
                
                // Obtém session do Supabase
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                  throw new Error('Usuário não autenticado');
                }

                // Envia para a função serverless
                const response = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    token: token,
                    payment_method_id: formData.paymentMethodId,
                    issuer_id: formData.issuerId || null,
                    installments: Number(formData.installments) || 1,
                    amount: amount,
                    user_email: formData.cardholderEmail || user?.email,
                    item_type: itemType,
                    item_id: itemId,
                  }),
                });

                const result = await response.json();
                console.log('Resposta do servidor:', result);

                if (!response.ok) {
                  throw new Error(result.message || result.error || 'Erro no processamento do pagamento');
                }

                if (!['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || 'Pagamento não aprovado pela operadora');
                }

                console.log('Pagamento processado com sucesso! Status:', result.status);
                onSuccess();
                
              } catch (error: any) {
                console.error('Erro no processamento do pagamento:', error);
                onError(error.message || 'Erro ao processar pagamento. Tente novamente.');
              } finally {
                setProcessing(false);
              }
            },

            onBinChange: (bin: string) => {
              console.log('Bin alterado:', bin);
            },

            onPaymentMethodsReceived: (error: any, paymentMethods: any) => {
              if (error) {
                console.warn('Erro ao obter métodos de pagamento:', error);
                return;
              }
              console.log('Métodos de pagamento recebidos:', paymentMethods);
            }
          },
        });

        cardFormRef.current = cardForm;
        setLoading(false);
        console.log('Formulário de cartão inicializado com sucesso');
        
      } catch (error) {
        console.error('Erro crítico ao inicializar Mercado Pago:', error);
        onError('Erro crítico no sistema de pagamento. Recarregue a página.');
        setLoading(false);
      }
    };

    initializeCardForm();

    // Cleanup
    return () => {
      if (cardFormRef.current) {
        console.log('Executando cleanup do formulário...');
        cardFormRef.current.unmount();
        cardFormRef.current = null;
      }
    };
  }, [sdkLoaded, mpPublicKey, amount, user, itemType, itemId, onSuccess, onError, processing]);

  // Estados de loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <i className="fas fa-spinner fa-spin text-5xl text-green-500 mb-4"></i>
        <p className="text-gray-400">Carregando pagamento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-900 p-6 rounded-2xl border border-gray-700 relative">
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

      <button 
        onClick={onCancel} 
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        disabled={processing}
      >
        <i className="fas fa-times text-2xl"></i>
      </button>

      <form id="form-checkout" className="space-y-4">
        <div>
          <input 
            type="text" 
            id="form-checkout__cardNumber" 
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
            placeholder="Número do cartão" 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input 
              type="text" 
              id="form-checkout__expirationDate" 
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
              placeholder="MM/AA" 
            />
          </div>
          <div>
            <input 
              type="text" 
              id="form-checkout__securityCode" 
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
              placeholder="CVV" 
            />
          </div>
        </div>
        
        <div>
          <input 
            type="text" 
            id="form-checkout__cardholderName" 
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
            placeholder="Nome no cartão" 
          />
        </div>
        
        <div>
          <input 
            type="email" 
            id="form-checkout__cardholderEmail" 
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
            readOnly 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <select 
              id="form-checkout__issuer" 
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="">Banco emissor</option>
            </select>
          </div>
          <div>
            <select 
              id="form-checkout__installments" 
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="">Parcelas</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Processando...
            </>
          ) : (
            <>
              <i className="fas fa-credit-card"></i>
              Pagar Agora
            </>
          )}
        </button>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            <i className="fas fa-shield-alt mr-1"></i>
            Pagamento 100% seguro via Mercado Pago
          </p>
        </div>
      </form>
    </div>
  );
}