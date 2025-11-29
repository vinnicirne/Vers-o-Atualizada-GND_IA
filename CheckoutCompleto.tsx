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
  const mpInstanceRef = useRef<any>(null);
  const cardFormRef = useRef<any>(null);

  // Verificação robusta da public key
  const isValidPublicKey = (key: string | null): boolean => {
    if (!key) return false;
    return key.startsWith('TEST-') || key.startsWith('APP-USR-');
  };

  useEffect(() => {
    if (!mpPublicKey || !isValidPublicKey(mpPublicKey)) {
      onError('Chave pública do Mercado Pago inválida ou não configurada');
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeCheckout = async () => {
      try {
        console.log('🚀 Iniciando checkout com amount:', amount);
        console.log('🔑 Public Key:', mpPublicKey.substring(0, 15) + '...');

        // 1. Carregar SDK do Mercado Pago
        if (!window.MercadoPago) {
          await new Promise((resolve, reject) => {
            const scriptId = 'mercado-pago-sdk';
            
            if (document.getElementById(scriptId)) {
              resolve(true);
              return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            
            script.onload = () => {
              console.log('✅ SDK MercadoPago carregado');
              resolve(true);
            };
            
            script.onerror = () => {
              reject(new Error('Falha ao carregar SDK do Mercado Pago'));
            };

            document.body.appendChild(script);
          });
        }

        // 2. Aguardar SDK ficar totalmente disponível
        await new Promise(resolve => setTimeout(resolve, 300));

        // 3. Criar instância do MercadoPago
        console.log('🔄 Criando instância do MercadoPago...');
        const mp = new window.MercadoPago(mpPublicKey, {
          locale: 'pt-BR'
        });

        // ✅ VERIFICAÇÃO CRÍTICA: Testar se a instância foi criada corretamente
        if (!mp || typeof mp !== 'object') {
          throw new Error('Falha na criação da instância do MercadoPago');
        }

        console.log('✅ Instância MercadoPago criada:', mp);
        mpInstanceRef.current = mp;

        // 4. Testar métodos básicos da instância
        if (typeof mp.cardForm !== 'function') {
          throw new Error('Método cardForm não disponível na instância');
        }

        // 5. Configurar o cardForm com tratamento robusto de erros
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
                console.error('❌ Erro no onFormMounted:', error);
                if (mounted) onError('Erro ao configurar formulário de pagamento');
                return;
              }

              console.log('✅ Formulário montado com sucesso!');
              
              // Preencher email do usuário
              setTimeout(() => {
                if (user?.email) {
                  const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                  if (emailInput) {
                    emailInput.value = user.email;
                    console.log('📧 Email preenchido:', user.email);
                  }
                }
              }, 200);
            },

            onFormUnmounted: (error: any) => {
              console.log('🔴 Formulário desmontado:', error);
            },

            // ✅ CALLBACK CORRIGIDO: Installments com tratamento de erro
            onInstallmentsReceived: (error: any, installments: any) => {
              if (error) {
                console.warn('⚠️ Erro ao carregar parcelas:', error);
                return;
              }
              console.log('📊 Parcelas recebidas:', installments);
            },

            // ✅ CALLBACK IMPORTANTE: Captura mudanças no BIN
            onBinChange: async (bin: string) => {
              if (!bin || bin.length < 6) return;
              
              console.log('💳 BIN detectado:', bin);
              
              try {
                // ✅ CHAMADA CORRETA para getInstallments
                if (mpInstanceRef.current && mpInstanceRef.current.getInstallments) {
                  const installments = await mpInstanceRef.current.getInstallments({
                    amount: amount,
                    bin: bin
                  });
                  
                  console.log('💰 Opções de parcelamento:', installments);
                }
              } catch (error) {
                console.warn('⚠️ Erro ao buscar parcelas:', error);
              }
            },

            // ✅ CALLBACK de métodos de pagamento
            onPaymentMethodsReceived: (error: any, paymentMethods: any) => {
              if (error) {
                console.warn('⚠️ Erro ao carregar métodos de pagamento:', error);
                return;
              }
              console.log('💳 Métodos de pagamento:', paymentMethods);
            },

            // ✅ Submit do formulário
            onSubmit: async (event: Event) => {
              event.preventDefault();
              
              if (processing || !mounted) return;
              
              console.log('🚀 Iniciando processamento do pagamento...');
              setProcessing(true);

              try {
                // Gerar token do cartão
                const { token, error: tokenError } = await cardForm.createCardToken();
                
                console.log('🔐 Token gerado:', token ? '✅' : '❌');
                
                if (tokenError || !token) {
                  const errorMsg = tokenError?.[0]?.message || 'Falha ao processar cartão';
                  throw new Error(errorMsg);
                }

                // Obter dados do formulário
                const formData = cardForm.getCardFormData();
                console.log('📋 Dados do formulário:', formData);
                
                // Obter sessão do usuário
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                  throw new Error('Usuário não autenticado');
                }

                // Processar pagamento no backend
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
                console.log('📦 Resposta do servidor:', result);

                if (!response.ok) {
                  throw new Error(result.message || result.error || 'Erro no processamento do pagamento');
                }

                if (!['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || 'Pagamento não aprovado');
                }

                console.log('🎉 Pagamento processado com sucesso!');
                onSuccess();
                
              } catch (error: any) {
                console.error('💥 Erro no processamento:', error);
                if (mounted) {
                  onError(error.message || 'Erro ao processar pagamento');
                }
              } finally {
                if (mounted) {
                  setProcessing(false);
                }
              }
            },
          },
        });

        cardFormRef.current = cardForm;
        
        if (mounted) {
          setLoading(false);
          console.log('✅ Checkout totalmente inicializado!');
        }

      } catch (error: any) {
        console.error('💥 Erro crítico na inicialização:', error);
        if (mounted) {
          onError(error.message || 'Erro ao inicializar sistema de pagamento');
          setLoading(false);
        }
      }
    };

    initializeCheckout();

    return () => {
      mounted = false;
      console.log('🧹 Cleanup do checkout');
      
      if (cardFormRef.current) {
        try {
          cardFormRef.current.unmount();
        } catch (error) {
          console.warn('Erro no cleanup do cardForm:', error);
        }
      }
    };
  }, [mpPublicKey, amount, user, itemType, itemId, onSuccess, onError, processing]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <i className="fas fa-spinner fa-spin text-5xl text-green-500 mb-4"></i>
        <p className="text-gray-400">Configurando pagamento seguro...</p>
        <p className="text-sm text-gray-500 mt-2">Aguarde alguns instantes</p>
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
        type="button"
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
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 focus:outline-none focus:border-green-500 transition-colors"
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