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

  // Efeito para inicializar o Mercado Pago
  useEffect(() => {
    if (!mpPublicKey) {
      onError('Chave pública do Mercado Pago não configurada');
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeMercadoPago = async () => {
      try {
        // Carrega o SDK se não estiver carregado
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
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago'));
            document.body.appendChild(script);
          });
        }

        // Aguarda o SDK ficar disponível
        await new Promise(resolve => setTimeout(resolve, 100));

        // Cria a instância do Mercado Pago
        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
        mpInstanceRef.current = mp;

        // Inicializa o cardForm
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
                console.error('Erro ao montar o formulário:', error);
                if (mounted) onError('Erro ao montar o formulário de pagamento');
                return;
              }
              console.log('Formulário montado com sucesso!');
              if (user?.email) {
                const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
                if (emailInput) emailInput.value = user.email;
              }
            },
            onFormUnmounted: (error: any) => {
              console.log('Formulário desmontado', error);
            },
            onBinChange: async (bin: string) => {
              if (!mounted) return;
              console.log('BIN alterado:', bin);
              if (bin.length >= 6) {
                try {
                  const installments = await mpInstanceRef.current.getInstallments({
                    amount: amount.toString(),
                    bin: bin,
                  });
                  if (!installments || installments.length === 0) {
                    console.warn('Nenhuma opção de parcelamento disponível');
                  } else {
                    console.log('Parcelas recebidas:', installments);
                  }
                } catch (error) {
                  console.error('Erro ao buscar parcelas:', error);
                }
              }
            },
            onSubmit: async (event: Event) => {
              event.preventDefault();
              if (processing || !mounted) return;

              setProcessing(true);
              try {
                const { token, error: tokenError } = await cardFormRef.current.createCardToken();
                if (tokenError || !token) {
                  throw new Error(tokenError?.[0]?.message || 'Erro ao gerar token do cartão');
                }

                const formData = cardFormRef.current.getCardFormData();
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  throw new Error('Usuário não autenticado');
                }

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

                onSuccess();
              } catch (error: any) {
                console.error('Erro no pagamento:', error);
                if (mounted) onError(error.message || 'Erro ao processar pagamento');
              } finally {
                if (mounted) setProcessing(false);
              }
            },
          },
        });

        cardFormRef.current = cardForm;
        if (mounted) setLoading(false);
      } catch (error: any) {
        console.error('Erro ao inicializar Mercado Pago:', error);
        if (mounted) {
          onError(error.message || 'Erro ao inicializar o pagamento');
          setLoading(false);
        }
      }
    };

    initializeMercadoPago();

    return () => {
      mounted = false;
      if (cardFormRef.current) {
        cardFormRef.current.unmount();
      }
    };
  }, [mpPublicKey, amount]); // dependências reduzidas

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
