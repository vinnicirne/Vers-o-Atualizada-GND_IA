import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { finalizeMercadoPagoPayment } from '../services/paymentService';
import { useUser } from '../contexts/UserContext';

// Define a interface para o objeto MercadoPago global
declare global {
  interface Window {
    MercadoPago: any; // Tipo any para cobrir a complexidade do objeto
  }
}

interface MercadoPagoCheckoutProps {
  preferenceId: string;
  publicKey: string;
  amount: number;
  userEmail: string;
  paymentType: 'plan' | 'credits' | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export function MercadoPagoCheckout({
  preferenceId,
  publicKey,
  amount,
  userEmail,
  paymentType,
  onSuccess,
  onError,
  onClose,
}: MercadoPagoCheckoutProps) {
  const { user } = useUser();
  const formRef = useRef<HTMLFormElement>(null);
  const cardFormRef = useRef<any>(null); // Referência para o objeto CardForm do MP
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [installments, setInstallments] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  useEffect(() => {
    // Carrega o SDK do Mercado Pago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      try {
        if (!window.MercadoPago) {
          throw new Error("MercadoPago SDK não carregou corretamente.");
        }
        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });

        const cardForm = mp.cardForm({
          amount: amount.toFixed(2),
          iframe: true, // Garante que os campos de entrada sejam iframes seguros
          formValid: (event: any) => {
            // Este callback é acionado quando o formulário é válido.
            // Permite habilitar o botão de pagamento.
          },
          onReady: (error: any) => {
            if (error) {
              console.error("Erro no onReady do CardForm:", error);
              setPaymentError("Erro ao iniciar o formulário de pagamento. Verifique as chaves.");
            } else {
              setIsLoading(false);
              // Buscar métodos de pagamento para exibir bandeiras e parcelamento
              cardForm.getPaymentMethods().then((methods: any) => {
                setPaymentMethods(methods);
              });
            }
          },
          onFetching: (resource: any) => {
            // Callback para mostrar/esconder loading durante requisições internas do MP
          },
          callbacks: {
            onFormValid: (errors: any) => {
              // Habilita/desabilita botão de submit
              const isFormComplete = !Object.keys(errors).length;
              const submitButton = document.getElementById('mp-card-form-submit-button');
              if (submitButton) {
                (submitButton as HTMLButtonElement).disabled = !isFormComplete;
              }
            },
            onInstallmentsReceived: (installmentsData: any) => {
              // Atualiza o estado com as opções de parcelamento
              const selectInstallments = document.getElementById('mp-installments');
              if (selectInstallments) {
                const optionsHtml = installmentsData.options.map((option: any) => `
                  <option value="${option.installments}">${option.description}</option>
                `).join('');
                selectInstallments.innerHTML = optionsHtml;
              }
            },
            onPaymentMethodReceived: (paymentMethod: any) => {
              // Quando o método de pagamento (bandeira) é detectado
              setSelectedPaymentMethodId(paymentMethod.id);
            }
          }
        });
        cardFormRef.current = cardForm;
      } catch (mpInitError: any) {
        console.error("Erro ao inicializar MercadoPago:", mpInitError);
        setPaymentError(`Falha ao carregar o formulário de pagamento: ${mpInitError.message}`);
        setIsLoading(false);
      }
    };
    script.onerror = () => {
      setPaymentError("Não foi possível carregar o script do Mercado Pago. Verifique sua conexão ou adblock.");
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (cardFormRef.current) {
        cardFormRef.current.unmount();
        cardFormRef.current = null;
      }
    };
  }, [publicKey, amount]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cardFormRef.current || !user || !selectedPaymentMethodId) {
      setPaymentError("Formulário inválido ou usuário não logado.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const cardToken = await cardFormRef.current.createCardToken();
      if (!cardToken || cardToken.error) {
        throw new Error(cardToken?.error?.message || "Falha ao tokenizar o cartão.");
      }

      const response = await finalizeMercadoPagoPayment({
        paymentMethodId: selectedPaymentMethodId,
        token: cardToken.id,
        issuerId: cardFormRef.current.getIssuer().id,
        installments: installments,
        amount: amount,
        description: `Compra de ${paymentType === 'plan' ? 'plano' : 'créditos'} GDN_IA`,
        payerEmail: user.email,
        preferenceId: preferenceId,
      }, user);

      if (response.success) {
        onSuccess();
      } else {
        throw new Error(response.message || "Pagamento não aprovado.");
      }
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      setPaymentError(error.message || "Erro desconhecido ao processar pagamento.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black rounded-lg shadow-xl w-full max-w-lg border border-purple-500/50 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-purple-900/50 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.23.11/mercadopago/logo__small.png" alt="Mercado Pago" className="h-6" />
            <h2 className="text-xl font-bold text-white">Finalizar Pagamento com Cartão</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-10 flex flex-col items-center">
              <i className="fas fa-spinner fa-spin text-4xl text-purple-400 mb-4"></i>
              <p className="text-white">Carregando formulário de pagamento...</p>
            </div>
          ) : paymentError ? (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center" role="alert">
              <strong>Erro: </strong>{paymentError}
            </div>
          ) : (
            <form id="mp-card-form" ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div id="form-checkout__cardNumber-container" className="mp-input-container">
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">Número do Cartão</label>
                <div className="mp-input mp-form-input bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div id="form-checkout__expirationDate-container" className="mp-input-container">
                  <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">Validade</label>
                  <div className="mp-input mp-form-input bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></div>
                </div>
                <div id="form-checkout__securityCode-container" className="mp-input-container">
                  <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">CVV</label>
                  <div className="mp-input mp-form-input bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></div>
                </div>
              </div>

              <div id="form-checkout__cardholderName-container" className="mp-input-container">
                <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">Nome do Titular</label>
                <div className="mp-input mp-form-input bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div id="form-checkout__identificationType-container" className="mp-input-container">
                  <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">Tipo Documento</label>
                  <div className="mp-input mp-form-input bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></div>
                </div>
                <div id="form-checkout__identificationNumber-container" className="mp-input-container">
                  <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">Número Documento</label>
                  <div className="mp-input mp-form-input bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"></div>
                </div>
              </div>
              
              <div id="form-checkout__installments-container">
                  <label htmlFor="mp-installments" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-400">Parcelas</label>
                  <select
                      id="mp-installments"
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                      className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0"
                  >
                      {/* Options populated by Mercado Pago SDK */}
                  </select>
              </div>

              <input type="hidden" id="form-checkout__issuerId" name="issuerId" />
              <input type="hidden" id="form-checkout__paymentMethodId" name="paymentMethodId" />
              <input type="hidden" id="form-checkout__installments" name="installments" />
              <input type="hidden" id="form-checkout__token" name="token" />
              <input type="hidden" id="form-checkout__amount" name="amount" value={amount.toFixed(2)} />
              <input type="hidden" id="form-checkout__payerEmail" name="payerEmail" value={userEmail} />

              <div className="text-center pt-4">
                <p className="text-sm text-gray-400">Total a pagar: <span className="font-bold text-white">R$ {amount.toFixed(2).replace('.', ',')}</span></p>
                <button
                  type="submit"
                  id="mp-card-form-submit-button"
                  disabled={isProcessingPayment || isLoading}
                  className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition shadow-lg shadow-purple-600/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i> Processando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-2"></i> Pagar Agora
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="p-4 bg-black/50 flex justify-end rounded-b-lg border-t border-purple-900/50">
          <button
            onClick={onClose}
            disabled={isProcessingPayment}
            className="px-4 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
}