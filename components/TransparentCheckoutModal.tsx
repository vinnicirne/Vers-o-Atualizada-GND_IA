import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TransparentPaymentFormData, MercadoPagoCardToken } from '../types';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface TransparentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: TransparentPaymentFormData) => Promise<void>;
  publicKey: string;
  amount: number;
  description: string;
  payerEmail: string;
  metadata: any;
  isProcessing: boolean;
}

export function TransparentCheckoutModal({
  isOpen,
  onClose,
  onSubmit,
  publicKey,
  amount,
  description,
  payerEmail,
  metadata,
  isProcessing,
}: TransparentCheckoutModalProps) {
  const [cardForm, setCardForm] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    cardExpirationMonth: '',
    cardExpirationYear: '',
    securityCode: '',
    issuer: '',
    installments: '1',
    identificationType: 'CPF', // Default
    identificationNumber: '',
    email: payerEmail,
  });
  const [docTypes, setDocTypes] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; thumbnail: string; min_allowed_amount: number; max_allowed_amount: number; }[]>([]);
  const [issuers, setIssuers] = useState<{ id: string; name: string; }[]>([]);
  const [installmentsOptions, setInstallmentsOptions] = useState<{ quantity: number; amount: number; }[]>([]);
  const [brandIcon, setBrandIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!window.MercadoPago) {
      setError("Mercado Pago SDK não carregado. Verifique a conexão ou o script no index.html.");
      return;
    }

    const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });

    const cardFormInstance = mp.cardForm({
      amount: amount.toFixed(2),
      iframe: false,
      form: {
        id: 'form-checkout',
        cardNumber: { id: 'cardNumber', placeholder: 'Número do cartão' },
        cardholderName: { id: 'cardholderName', placeholder: 'Nome e sobrenome' },
        cardExpirationMonth: { id: 'cardExpirationMonth', placeholder: 'MM' },
        cardExpirationYear: { id: 'cardExpirationYear', placeholder: 'AA' },
        securityCode: { id: 'securityCode', placeholder: 'Código de segurança' },
        installments: { id: 'installments', placeholder: 'Parcelas' },
        identificationType: { id: 'identificationType', placeholder: 'Tipo de documento' },
        identificationNumber: { id: 'identificationNumber', placeholder: 'Número do documento' },
        issuer: { id: 'issuer', placeholder: 'Banco emissor' },
        cardholderEmail: { id: 'cardholderEmail', placeholder: 'E-mail' },
      },
      callbacks: {
        onReady: () => {
          // console.log('Mercado Pago CardForm is ready');
          // Fetch document types and pre-fill form data if available
          mp.getIdentificationTypes().then((types: any) => {
            setDocTypes(types);
            if (types.length > 0 && !formData.identificationType) {
              setFormData(prev => ({ ...prev, identificationType: types[0].id }));
            }
          }).catch((err: any) => console.error("Failed to fetch identification types:", err));
        },
        onFormMounted: (error: any) => {
          if (error) {
            setError(error.message);
            return;
          }
        },
        onFormUnmounted: (error: any) => {
            if (error) {
                setError(error.message);
                return;
            }
        },
        onFetching: (resource: any) => {
          // console.log('Fetching resource:', resource);
          setError(null); // Clear previous errors during fetching
        },
        onCardTokenReceived: (token: MercadoPagoCardToken, mappedCallbacks: any) => {
          // This callback is for the client-side token generation, not for payment processing.
          // The actual payment processing should happen on the server-side.
          // Here we prepare the data to be sent to our (simulated) backend.
          // console.log('Card token received:', token);
          
          if (!formData.email) {
            setError("E-mail do titular do cartão é obrigatório.");
            return;
          }

          const paymentData: TransparentPaymentFormData = {
            token: token.id,
            payerEmail: formData.email,
            installments: parseInt(formData.installments, 10),
            paymentMethodId: token.payment_method_id,
            amount: amount,
            description: description,
            metadata: metadata,
          };
          onSubmit(paymentData);
        },
        onInstallmentsReceived: (installments: any[]) => {
            setInstallmentsOptions(installments?.[0]?.payer_costs || []);
        },
        onPaymentMethodReceived: (paymentMethod: any) => {
            // console.log('Payment method received:', paymentMethod);
            setPaymentMethods([paymentMethod]);
            setBrandIcon(paymentMethod.thumbnail);
            if(paymentMethod.id) {
                mp.getIssuers(paymentMethod.id).then((issuers: any) => {
                    setIssuers(issuers);
                    if (issuers.length > 0 && !formData.issuer) {
                        setFormData(prev => ({ ...prev, issuer: issuers[0].id }));
                    }
                }).catch((err: any) => console.error("Failed to fetch issuers:", err));
            }
        },
        onError: (err: any) => {
            console.error('Mercado Pago error:', err);
            // err can be an array of objects
            if (Array.isArray(err) && err.length > 0) {
                // Prioritize the first error message or a general one
                setError(err[0].message || 'Ocorreu um erro ao processar o pagamento. Verifique os dados do cartão.');
            } else if (err && typeof err.message === 'string') {
                setError(err.message);
            } else {
                setError('Ocorreu um erro desconhecido no Mercado Pago. Tente novamente.');
            }
        },
      },
    });
    setCardForm(cardFormInstance);

    return () => {
      // Cleanup: Unmount the cardForm when the modal closes
      if (cardFormInstance && cardFormInstance.unmount) {
        cardFormInstance.unmount();
      }
      setCardForm(null);
      setError(null);
      setBrandIcon(null);
      setPaymentMethods([]);
      setIssuers([]);
      setInstallmentsOptions([]);
    };
  }, [isOpen, amount, description, payerEmail, publicKey, metadata, onSubmit, formData.identificationType, formData.issuer, formData.email]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null); // Clear errors on input change
    
    // Trigger Mercado Pago SDK updates for card number, expiration, etc.
    if (cardForm && ['cardNumber', 'cardExpirationMonth', 'cardExpirationYear', 'securityCode'].includes(name)) {
        cardForm.createCardToken();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cardForm) {
      setError("Formulário de cartão não inicializado.");
      return;
    }
    cardForm.createCardToken(); // This will trigger onCardTokenReceived callback
  };

  const inputClasses = "w-full bg-black border-2 border-gray-700 text-gray-200 p-3 text-sm rounded-md focus:border-purple-500 focus:outline-none focus:ring-0 transition duration-300 disabled:opacity-50";
  const labelClasses = "block text-xs uppercase font-bold mb-2 tracking-wider text-purple-400";

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-black border border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-purple-900/30 flex justify-between items-center sticky top-0 bg-black z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Finalizar Compra</h2>
            <p className="text-sm text-gray-400">Total: <span className="text-purple-400 font-bold">R$ {amount.toFixed(2).replace('.', ',')}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition" disabled={isProcessing}>
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="form-checkout" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg text-sm mb-4 animate-fade-in">
                <i className="fas fa-exclamation-circle mr-2"></i>{error}
              </div>
            )}

            {/* Card Number */}
            <div>
              <label htmlFor="cardNumber" className={labelClasses}>Número do Cartão</label>
              <div className="relative">
                <input
                  type="text"
                  id="cardNumber"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleChange}
                  className={inputClasses + " pr-12"}
                  disabled={isProcessing}
                />
                 {brandIcon && <img src={brandIcon} alt="Card brand" className="absolute right-3 top-1/2 -translate-y-1/2 h-6" />}
              </div>
            </div>

            {/* Cardholder Name */}
            <div>
              <label htmlFor="cardholderName" className={labelClasses}>Nome no Cartão</label>
              <input
                type="text"
                id="cardholderName"
                name="cardholderName"
                value={formData.cardholderName}
                onChange={handleChange}
                className={inputClasses}
                disabled={isProcessing}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Expiration Month */}
              <div>
                <label htmlFor="cardExpirationMonth" className={labelClasses}>Mês Vencimento</label>
                <input
                  type="text"
                  id="cardExpirationMonth"
                  name="cardExpirationMonth"
                  value={formData.cardExpirationMonth}
                  onChange={handleChange}
                  placeholder="MM"
                  maxLength={2}
                  className={inputClasses}
                  disabled={isProcessing}
                />
              </div>

              {/* Expiration Year */}
              <div>
                <label htmlFor="cardExpirationYear" className={labelClasses}>Ano Vencimento</label>
                <input
                  type="text"
                  id="cardExpirationYear"
                  name="cardExpirationYear"
                  value={formData.cardExpirationYear}
                  onChange={handleChange}
                  placeholder="AA"
                  maxLength={2}
                  className={inputClasses}
                  disabled={isProcessing}
                />
              </div>

              {/* Security Code */}
              <div>
                <label htmlFor="securityCode" className={labelClasses}>Cód. Segurança</label>
                <input
                  type="text"
                  id="securityCode"
                  name="securityCode"
                  value={formData.securityCode}
                  onChange={handleChange}
                  maxLength={4}
                  className={inputClasses}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Document Type and Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="identificationType" className={labelClasses}>Tipo Doc.</label>
                <select
                  id="identificationType"
                  name="identificationType"
                  value={formData.identificationType}
                  onChange={handleChange}
                  className={inputClasses + " cursor-pointer"}
                  disabled={isProcessing}
                >
                  {docTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="identificationNumber" className={labelClasses}>Número Doc.</label>
                <input
                  type="text"
                  id="identificationNumber"
                  name="identificationNumber"
                  value={formData.identificationNumber}
                  onChange={handleChange}
                  className={inputClasses}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Issuer (Banco Emissor) */}
            {issuers.length > 0 && (
                <div>
                    <label htmlFor="issuer" className={labelClasses}>Banco Emissor</label>
                    <select
                        id="issuer"
                        name="issuer"
                        value={formData.issuer}
                        onChange={handleChange}
                        className={inputClasses + " cursor-pointer"}
                        disabled={isProcessing}
                    >
                        {issuers.map(issuer => (
                            <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
                        ))}
                    </select>
                </div>
            )}


            {/* Installments */}
            {installmentsOptions.length > 0 && (
                <div>
                    <label htmlFor="installments" className={labelClasses}>Parcelas</label>
                    <select
                        id="installments"
                        name="installments"
                        value={formData.installments}
                        onChange={handleChange}
                        className={inputClasses + " cursor-pointer"}
                        disabled={isProcessing}
                    >
                        {installmentsOptions.map(option => (
                            <option key={option.quantity} value={option.quantity}>
                                {option.quantity}x de R$ {option.amount.toFixed(2).replace('.', ',')} (Total: R$ {(option.quantity * option.amount).toFixed(2).replace('.', ',')})
                            </option>
                        ))}
                    </select>
                </div>
            )}


            {/* Email (Cardholder Email) */}
            <div>
              <label htmlFor="cardholderEmail" className={labelClasses}>E-mail do Titular</label>
              <input
                type="email"
                id="cardholderEmail"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClasses}
                disabled={isProcessing}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-purple-600/20 uppercase tracking-wide text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-wait"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i> Processando...
                </>
              ) : (
                <>
                  <i className="fas fa-credit-card mr-2"></i> Pagar Agora
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
}