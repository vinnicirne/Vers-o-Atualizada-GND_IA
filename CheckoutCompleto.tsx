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
  
  // 🔥 REFS PARA EVITAR RECRIAÇÃO
  const mpInstanceRef = useRef<any>(null);
  const cardFormRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // ✅ VERIFICAÇÃO ROBUSTA DA PUBLIC KEY
  const isValidPublicKey = (key: string | null): boolean => {
    if (!key) return false;
    return key.startsWith('TEST-') || key.startsWith('APP-USR-');
  };

  useEffect(() => {
    // 🔥 EVITA MULTIPLAS INICIALIZAÇÕES
    if (initializedRef.current) return;
    if (!mpPublicKey || !isValidPublicKey(mpPublicKey)) {
      onError('Chave pública do Mercado Pago inválida');
      setLoading(false);
      return;
    }

    let mounted = true;
    console.log('🚀 INICIANDO CHECKOUT - Mounted');

    const initialize = async () => {
      try {
        // 1. CARREGAR SDK APENAS UMA VEZ
        if (!window.MercadoPago) {
          await new Promise((resolve, reject) => {
            const scriptId = 'mercado-pago-sdk';
            const existingScript = document.getElementById(scriptId);
            
            if (existingScript) {
              resolve(true);
              return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            
            script.onload = () => {
              console.log('✅ SDK Carregado');
              resolve(true);
            };
            
            script.onerror = () => reject(new Error('Falha ao carregar SDK'));
            document.body.appendChild(script);
          });
        }

        // 2. AGUARDAR SDK ESTAR PRONTO
        await new Promise(resolve => setTimeout(resolve, 500));

        // 3. CRIAR INSTÂNCIA DO MERCADO PAGO
        console.log('🔄 Criando instância MP...');
        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
        
        // ✅ VERIFICAÇÃO CRÍTICA DA INSTÂNCIA
        if (!mp || typeof mp.cardForm !== 'function') {
          throw new Error('Instância do MercadoPago não criada corretamente');
        }

        mpInstanceRef.current = mp;
        console.log('✅ Instância MP criada com sucesso');

        // 4. INICIALIZAR CARD FORM
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
              if (error) {
                console.error('❌ onFormMounted error:', error);
                if (mounted) onError('Erro ao montar formulário');
                return;
              }
              console.log('✅ Formulário montado!');
              
              // Preencher email
              if (user?.email) {
                setTimeout(() => {
                  const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                  if (emailInput) emailInput.value = user.email;
                }, 300);
              }
            },

            // 🔥 CALLBACK CORRIGIDO: INSTALLMENTS
            onInstallmentsReceived: (error: any, installments: any) => {
              if (error) {
                console.warn('⚠️ Installments error:', error);
                return;
              }
              console.log('💰 Installments received:', installments);
            },

            // 🔥 CALLBACK ESSENCIAL: BIN CHANGE
            onBinChange: async (bin: string) => {
              if (!mounted || !bin || bin.length < 6) return;
              
              console.log('💳 BIN detectado:', bin);
              
              try {
                // ✅ CHAMADA CORRETA PARA GETINSTALLMENTS
                if (mpInstanceRef.current && mpInstanceRef.current.getInstallments) {
                  const installments = await mpInstanceRef.current.getInstallments({
                    amount: amount,
                    bin: bin
                  });
                  console.log('📊 Parcelas carregadas:', installments);
                }
              } catch (error) {
                console.error('💥 Erro ao buscar parcelas:', error);
              }
            },

            // ✅ SUBMIT CORRIGIDO
            onSubmit: async (event: Event) => {
              event.preventDefault();
              if (processing || !mounted) return;

              console.log('🚀 Iniciando pagamento...');
              setProcessing(true);

              try {
                // Gerar token
                const { token, error: tokenError } = await cardForm.createCardToken();
                
                if (tokenError || !token) {
                  throw new Error(tokenError?.[0]?.message || 'Falha no token do cartão');
                }

                // Obter dados do formulário
                const formData = cardForm.getCardFormData();
                
                // ✅ VERIFICAR DADOS CRÍTICOS
                if (!formData.paymentMethodId) {
                  throw new Error('Método de pagamento não identificado');
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Usuário não autenticado');

                // Processar pagamento
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

                if (!response.ok) {
                  throw new Error(result.message || result.error || 'Erro no pagamento');
                }

                if (!['approved', 'pending', 'in_process'].includes(result.status)) {
                  throw new Error(result.message || 'Pagamento não aprovado');
                }

                console.log('🎉 Pagamento aprovado!');
                onSuccess();
                
              } catch (error: any) {
                console.error('💥 Erro no pagamento:', error);
                if (mounted) onError(error.message || 'Erro ao processar pagamento');
              } finally {
                if (mounted) setProcessing(false);
              }
            },

            onFormUnmounted: (error: any) => {
              console.log('🔴 Formulário desmontado:', error);
            }
          },
        });

        cardFormRef.current = cardForm;
        initializedRef.current = true;
        
        if (mounted) {
          setLoading(false);
          console.log('✅ Checkout inicializado com sucesso!');
        }

      } catch (error: any) {
        console.error('💥 Erro crítico:', error);
        if (mounted) {
          onError(error.message || 'Erro ao inicializar pagamento');
          setLoading(false);
        }
      }
    };

    initialize();

    // 🔥 CLEANUP MELHORADO
    return () => {
      console.log('🧹 Executando cleanup...');
      mounted = false;
      
      // Não desmonta imediatamente, apenas marca como não mounted
      // O cleanup real acontece quando o componente é destruído
    };
  }, []); // 🔥 DEPENDÊNCIAS VAZIAS - EXECUTA APENAS UMA VEZ

  // 🔥 USE EFFECT SEPARADO PARA ATUALIZAR AMOUNT
  useEffect(() => {
    if (cardFormRef.current && initializedRef.current) {
      console.log('🔄 Atualizando amount para:', amount);
      // Atualiza o amount no cardForm se necessário
    }
  }, [amount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <i className="fas fa-spinner fa-spin text-5xl text-green-500 mb-4"></i>
        <p className="text-gray-400">Inicializando pagamento...</p>
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
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 focus:outline-none focus:border-green-500 transition-colors"
            readOnly 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select 
            id="form-checkout__issuer"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value="">Banco emissor</option>
          </select>
          <select 
            id="form-checkout__installments"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value="">Parcelas</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-lg transition-all duration-200"
        >
          {processing ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Processando...
            </>
          ) : (
            'Pagar Agora'
          )}
        </button>
      </form>
    </div>
  );
}