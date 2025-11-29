import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient'; // Import supabase

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
  asaasPublicKey: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export default function CheckoutCompleto({
  amount,
  itemType,
  itemId,
  mpPublicKey,
  asaasPublicKey, // Not used directly in MP component, but prop is here
  onSuccess,
  onCancel,
  onError, // Use onError prop instead of internal state for consistency
}: CheckoutCompletoProps) {
  const { user } = useUser();
  
  // Internal UI states
  const [loadingSdk, setLoadingSdk] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null); // For errors before calling onError prop

  // SDK/DOM readiness states
  const [isComponentRendered, setIsComponentRendered] = useState(false);
  const [isMpScriptLoaded, setIsMpScriptLoaded] = useState(false);

  // States for dynamic dropdowns
  const [issuerOptions, setIssuerOptions] = useState<any[]>([]);
  const [installmentsOptions, setInstallmentsOptions] = useState<any[]>([]);
  const [isIssuerLoading, setIsIssuerLoading] = useState(false);
  const [isInstallmentsLoading, setIsInstallmentsLoading] = useState(false);


  // Refs for Mercado Pago SDK instance and script element
  const cardFormInstanceRef = useRef<any>(null);
  const mpScriptRef = useRef<HTMLScriptElement | null>(null);
  const componentMountedRef = useRef(true); // To track component mount status for async operations

  // --- 1. Effect for Component Mount Status ---
  useEffect(() => {
    componentMountedRef.current = true;
    setIsComponentRendered(true); // Signal that component's JSX is rendered
    return () => {
      componentMountedRef.current = false;
      setIsComponentRendered(false);
    };
  }, []);

  // --- 2. Effect for Mercado Pago Script Loading ---
  useEffect(() => {
    if (!mpPublicKey || !isComponentRendered) {
      // If no public key, or component not rendered, ensure script is removed and state reset
      if (mpScriptRef.current && document.body.contains(mpScriptRef.current)) {
        document.body.removeChild(mpScriptRef.current);
        mpScriptRef.current = null;
      }
      setIsMpScriptLoaded(false);
      setLoadingSdk(false);
      if (!mpPublicKey && isComponentRendered) { // Only set error if it's the actual issue and component is rendered
        setInternalError('Chave Mercado Pago não configurada');
        onError('Chave Mercado Pago não configurada');
      }
      return;
    }

    // Prevent duplicate script loading
    if (window.MercadoPago && window.mpReady && mpScriptRef.current) {
      setIsMpScriptLoaded(true);
      return;
    }

    // If script is already being loaded by this ref, just monitor it
    if (mpScriptRef.current && document.body.contains(mpScriptRef.current)) {
        // If it's already in the DOM and we just need to wait for onload
        if (!window.mpReady) {
            mpScriptRef.current.onload = () => {
                if (componentMountedRef.current) {
                    window.mpReady = true;
                    setIsMpScriptLoaded(true);
                }
            };
            mpScriptRef.current.onerror = () => {
                if (componentMountedRef.current) {
                    setInternalError('Falha ao carregar SDK Mercado Pago (existente)');
                    onError('Falha ao carregar SDK Mercado Pago (existente)');
                    setIsMpScriptLoaded(false);
                    setLoadingSdk(false);
                }
            };
        } else {
            setIsMpScriptLoaded(true); // Script is loaded and ready
        }
        return;
    }

    setLoadingSdk(true);
    setInternalError(null);

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.id = 'mercadopago-sdk'; // Add an ID for easier tracking

    script.onload = () => {
      if (componentMountedRef.current) {
        window.mpReady = true;
        setIsMpScriptLoaded(true);
        setLoadingSdk(false);
      }
    };
    script.onerror = () => {
      if (componentMountedRef.current) {
        setInternalError('Falha ao carregar SDK Mercado Pago');
        onError('Falha ao carregar SDK Mercado Pago');
        setIsMpScriptLoaded(false);
        setLoadingSdk(false);
      }
    };

    document.body.appendChild(script);
    mpScriptRef.current = script;

    return () => {
      // Cleanup: Remove the script on component unmount or dependency change
      if (mpScriptRef.current && document.body.contains(mpScriptRef.current)) {
        document.body.removeChild(mpScriptRef.current);
        mpScriptRef.current = null;
      }
      window.mpReady = false;
      setIsMpScriptLoaded(false);
    };
  }, [mpPublicKey, isComponentRendered, onError]);

  // --- 3. Effect for Mercado Pago Form Initialization ---
  useEffect(() => {
    // Log the amount to confirm what value is being passed
    console.log('CheckoutCompleto: Initializing with amount:', amount);

    // Conditions for initialization: MP Key exists, script loaded, component rendered, MercadoPago global object available.
    if (!mpPublicKey || !isMpScriptLoaded || !isComponentRendered || !window.MercadoPago) {
      // If prerequisites are not met, ensure the form is unmounted and state is clean.
      if (cardFormInstanceRef.current?.unmount) {
        try {
          cardFormInstanceRef.current.unmount();
        } catch (e) {
          console.warn("Error unmounting Mercado Pago form due to missing prerequisites:", e);
        }
        cardFormInstanceRef.current = null;
      }
      if (!mpPublicKey && isComponentRendered && !internalError) {
          setInternalError('Chave Mercado Pago não configurada');
          onError('Chave Mercado Pago não configurada');
      }
      setProcessingPayment(false);
      setLoadingSdk(false);
      
      // Reset dropdowns
      setIssuerOptions([]);
      setInstallmentsOptions([]);
      setIsIssuerLoading(false);
      setIsInstallmentsLoading(false);
      return;
    }
    
    // If all conditions are met, proceed with initialization.
    setInternalError(null);
    setLoadingSdk(false); // SDK is loaded, now form is initializing.

    // Unmount any existing form instance before creating a new one
    // This is crucial to prevent "CardForm is not mounted" errors if the effect re-runs.
    if (cardFormInstanceRef.current?.unmount) {
      try {
        cardFormInstanceRef.current.unmount();
        console.log("Mercado Pago CardForm instance unmounted during cleanup.");
      } catch (e) {
        console.warn("Error during Mercado Pago form cleanup (unmount safety):", e);
      }
      cardFormInstanceRef.current = null;
    }

    try {
      const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
      
      const newCardForm = mp.cardForm({
        amount: amount.toFixed(2),
        autoMount: true, // This requires the elements to be in DOM already
        form: {
          id: 'form-checkout',
          cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número do cartão' },
          expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
          securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
          cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartão' },
          cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'E-mail' },
          issuer: { id: 'form-checkout__issuer' }, // This will be a <select>
          installments: { id: 'form-checkout__installments' }, // This will be a <select>
        },
        callbacks: {
          onFormMounted: () => {
            if (!componentMountedRef.current) return;
            console.log('Mercado Pago Form Mounted!');
            setLoadingSdk(false); // Form is fully mounted
            if (user?.email) {
              const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
              if (emailInput) emailInput.value = user.email;
            }
          },
          onFormUnmounted: () => {
              console.log('Mercado Pago Form Unmounted!');
              cardFormInstanceRef.current = null; // Ensure ref is cleared on unmount
              // Reset dropdowns on unmount
              setIssuerOptions([]);
              setInstallmentsOptions([]);
              setIsIssuerLoading(false);
              setIsInstallmentsLoading(false);
          },
          onPaymentMethodReceived: (data: any) => {
              if (!componentMountedRef.current) return;
              console.log('Mercado Pago: Payment Method Received', data);
              setIsIssuerLoading(true);
              if (data && data.issuer && data.issuer.name) {
                  setIssuerOptions([{ value: data.issuer.id, label: data.issuer.name }]);
              } else {
                  setIssuerOptions([]);
              }
              setIsIssuerLoading(false);

              // Trigger installments lookup if card number is valid and amount > 0
              if (data?.paymentMethodId && amount > 0) {
                  setIsInstallmentsLoading(true);
                  mp.getInstallments({
                      amount: amount.toFixed(2),
                      payment_method_id: data.paymentMethodId,
                      issuer_id: data.issuer?.id,
                  }).then((instData: any) => {
                      if (!componentMountedRef.current) return;
                      console.log('Mercado Pago: Installments Received (after PM)', instData);
                      if (instData && instData.payer_costs && instData.payer_costs.length > 0) {
                          setInstallmentsOptions(instData.payer_costs);
                      } else {
                          setInstallmentsOptions([]);
                      }
                      setIsInstallmentsLoading(false);
                  }).catch((err: any) => {
                      if (!componentMountedRef.current) return;
                      console.error('Error fetching installments after PM:', err);
                      setInstallmentsOptions([]);
                      setIsInstallmentsLoading(false);
                  });
              } else {
                  setInstallmentsOptions([]);
                  setIsInstallmentsLoading(false);
              }
          },
          onInstallmentsReceived: (data: any) => {
              if (!componentMountedRef.current) return;
              // This callback can be triggered directly by SDK based on other events too.
              // It's a fallback/alternative to the logic inside onPaymentMethodReceived.
              console.log('Mercado Pago: Installments Received (direct)', data);
              setIsInstallmentsLoading(true);
              if (data && data.payer_costs && data.payer_costs.length > 0) {
                  setInstallmentsOptions(data.payer_costs);
              } else {
                  setInstallmentsOptions([]);
              }
              setIsInstallmentsLoading(false);
          },
          onSubmit: async (event: any) => {
            event.preventDefault();
            if (!componentMountedRef.current || !user?.id) {
              onError('Usuário não autenticado ou componente desmontado.');
              return;
            }

            setProcessingPayment(true);
            setInternalError(null); // Clear internal errors

            const { token: mpToken, paymentMethodId, issuerId, installments: numInstallments, cardholderEmail } = newCardForm.getCardFormData();

            // Get Supabase session token
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !sessionData.session?.access_token) {
              onError(sessionError?.message || 'Não foi possível obter o token de autenticação do usuário.');
              setProcessingPayment(false);
              return;
            }

            const supabaseFunctionUrl = 'https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar';

            try {
              const res = await fetch(supabaseFunctionUrl, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session.access_token}`, // JWT for Supabase Function
                },
                body: JSON.stringify({
                  token: mpToken,
                  payment_method_id: paymentMethodId,
                  issuer_id: issuerId,
                  installments: Number(numInstallments),
                  amount,
                  user_email: cardholderEmail || user.email,
                  item_type: itemType,
                  item_id: itemId,
                }),
              });

              const result = await res.json();

              if (result.status === 'approved' || result.status === 'pending' || result.status === 'CONFIRMED' || result.status === 'PENDING') {
                onSuccess();
              } else {
                const errorMessage = result.message || result.error || result.error_description || `Pagamento: ${result.status}`;
                onError(errorMessage); // Use onError prop
              }
            } catch (error: any) {
              console.error('Erro MP (fetch):', error);
              onError(error.message || 'Falha no pagamento'); // Use onError prop
            } finally {
              if (componentMountedRef.current) setProcessingPayment(false);
            }
          },
          onError: (errors: any) => {
            if (!componentMountedRef.current) return;
            const msg = errors[0]?.message || 'Erro desconhecido no formulário Mercado Pago';
            onError(msg); // Use onError prop
          },
        },
      });

      cardFormInstanceRef.current = newCardForm;

    } catch (err: any) {
      if (componentMountedRef.current) {
        setInternalError(err.message || 'Erro ao inicializar formulário Mercado Pago');
        onError(err.message || 'Erro ao inicializar formulário Mercado Pago');
      }
    }

    return () => {
      // Cleanup: Unmount the Mercado Pago form instance when component unmounts or dependencies change.
      // This try-catch block is important as the SDK might throw if it's already unmounted internally.
      if (cardFormInstanceRef.current?.unmount) {
        try {
          cardFormInstanceRef.current.unmount();
          console.log("Mercado Pago CardForm instance unmounted during cleanup.");
        } catch (e) {
          console.warn("Error during Mercado Pago form cleanup (unmount safety):", e);
        }
      }
      cardFormInstanceRef.current = null;
    };
  }, [
    amount, itemType, itemId, mpPublicKey, isMpScriptLoaded, isComponentRendered, 
    user?.id, user?.email, onSuccess, onError
  ]);

  // Handle local errors
  useEffect(() => {
    if (internalError) {
      onError(internalError);
    }
  }, [internalError, onError]);

  // --- Render Logic ---
  const currentError = internalError; // Prefer internal error message for display

  if (loadingSdk && (!isMpScriptLoaded || !isComponentRendered)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-black/80 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <i className="fas fa-spinner fa-spin text-4xl text-green-400 mb-4"></i>
        <p className="text-lg font-bold text-white">Carregando SDK de Pagamento...</p>
        <button onClick={onCancel} className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
          Fechar
        </button>
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-red-400 bg-black/80 rounded-lg shadow-xl w-full max-w-md border border-red-500">
        <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p className="text-lg font-bold">Erro de Pagamento</p>
        <p className="mt-2 text-sm">{currentError}</p>
        <button onClick={onCancel} className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-black/80 backdrop-blur-md p-10 rounded-xl shadow-lg border border-green-500/30">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">Checkout - R$ {amount.toFixed(2).replace('.', ',')}</h2>
      <p className="text-sm text-gray-400 text-center mb-6">
        Item: <span className="font-bold">{itemType === 'plan' ? `Plano ${itemId}` : `${itemId} Créditos`}</span>
      </p>

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
          <label htmlFor="form-checkout__issuer" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">
            Banco Emissor
            {isIssuerLoading && <i className="fas fa-spinner fa-spin ml-2 text-green-500 text-sm"></i>}
          </label>
          <select 
            id="form-checkout__issuer" 
            className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0"
            disabled={isIssuerLoading || issuerOptions.length === 0} // Disable if loading or no options
          >
            <option value="" disabled selected>
              {isIssuerLoading 
                ? 'Carregando bancos...' 
                : (issuerOptions.length > 0 ? 'Selecione o banco' : 'Digite o nº do cartão primeiro')}
            </option>
            {issuerOptions.map((issuer) => (
                <option key={issuer.value} value={issuer.value}>{issuer.label}</option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label htmlFor="form-checkout__installments" className="block text-xs uppercase font-bold mb-1 tracking-wider text-purple-400">
            Parcelas
            {isInstallmentsLoading && <i className="fas fa-spinner fa-spin ml-2 text-green-500 text-sm"></i>}
          </label>
          <select 
            id="form-checkout__installments" 
            className="w-full bg-black border-2 border-purple-900/60 p-3 rounded-md text-gray-200 text-sm focus:border-purple-500 focus:outline-none focus:ring-0"
            disabled={isInstallmentsLoading || installmentsOptions.length === 0} // Disable if loading or no options
          >
            <option value="" disabled selected>
              {isInstallmentsLoading 
                ? 'Carregando parcelas...' 
                : (installmentsOptions.length > 0 ? 'Selecione o número de parcelas' : 'Digite o nº do cartão primeiro')}
            </option>
            {installmentsOptions.map((inst: any) => (
                <option key={inst.installments} value={inst.installments}>
                    {inst.installments}x de {inst.installment_amount?.toFixed(2).replace('.', ',')} ({inst.total_amount?.toFixed(2).replace('.', ',')})
                </option>
            ))}
          </select>
        </div>
        <button
            type="submit"
            disabled={processingPayment}
            className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 text-black w-full py-5 rounded-lg text-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-wait transition-all"
        >
            {processingPayment ? (
            <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processando...
            </>
            ) : (
            'PAGAR COM CARTÃO'
            )}
        </button>
      </form>

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