import React, { useState, useEffect, useRef, memo } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

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

type GatewayType = 'mercadopago' | 'asaas' | null;
type PaymentMethodType = 'card' | 'pix';

// --- VALIDAÇÕES E HELPERS ---

const formatCardNumber = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19);
};

const formatExpiration = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
};

const formatCpfCnpj = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 14) return v.substring(0, 14); 
  
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return v.replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
  }
};

// Validação Matemática de CPF
function isValidCPF(cpf: string) {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    const cpfDigits = cpf.split('').map(el => +el);
    const rest = (count: number) => (cpfDigits.slice(0, count-12).reduce((soma, el, index) => (soma + el * (count-index)), 0)*10) % 11 % 10;
    return rest(10) === cpfDigits[9] && rest(11) === cpfDigits[10];
}

// Validação Matemática de CNPJ
function isValidCNPJ(cnpj: string) {
    if (!cnpj) return false;
    const s = cnpj.replace(/[^\d]+/g, '');
    if (s.length !== 14) return false;
    if (/^(\d)\1+$/.test(s)) return false;

    let tamanho = s.length - 2
    let numeros = s.substring(0, tamanho);
    const digitos = s.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = s.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != parseInt(digitos.charAt(1))) return false;

    return true;
}

// --- GENERIC PAYMENT FORM ---
const GenericPaymentForm = ({ 
    gateway, 
    userEmail, 
    formData, 
    onChange 
}: { 
    gateway: GatewayType, 
    userEmail: string,
    formData: any,
    onChange: (field: string, value: string) => void
}) => {
  const containerClass = "h-12 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden relative flex items-center px-4 transition-colors focus-within:border-green-500";
  const inputClass = "w-full h-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* CPF/CNPJ - Campo Comum e Obrigatório */}
      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">CPF ou CNPJ</label>
          <div className={containerClass}>
              <input
                type="text"
                className={inputClass}
                placeholder="000.000.000-00"
                value={formData.docNumber}
                onChange={(e) => onChange('docNumber', formatCpfCnpj(e.target.value))}
                maxLength={18}
              />
          </div>
      </div>

      {/* Número do Cartão */}
      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Número do Cartão</label>
          <div className={containerClass} id={gateway === 'mercadopago' ? "form-checkout__cardNumber" : undefined}>
             {gateway === 'asaas' && (
                 <input 
                    type="text" 
                    className={inputClass} 
                    placeholder="0000 0000 0000 0000"
                    value={formData.cardNumber}
                    onChange={(e) => onChange('cardNumber', formatCardNumber(e.target.value))}
                    maxLength={19}
                 />
             )}
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Validade */}
        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Validade</label>
           <div className={containerClass}>
             <input 
               type="text" 
               id={gateway === 'mercadopago' ? "form-checkout__expirationDate" : undefined}
               className={inputClass}
               placeholder="MM/AA"
               value={gateway === 'asaas' ? formData.expirationDate : undefined}
               onChange={gateway === 'asaas' ? (e) => onChange('expirationDate', formatExpiration(e.target.value)) : undefined}
               maxLength={5}
             />
           </div>
        </div>
        
        {/* CVV */}
        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">CVV</label>
           <div className={containerClass} id={gateway === 'mercadopago' ? "form-checkout__securityCode" : undefined}>
              {gateway === 'asaas' && (
                 <input 
                    type="text" 
                    className={inputClass} 
                    placeholder="123"
                    value={formData.cvv}
                    onChange={(e) => onChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                 />
             )}
           </div>
        </div>
      </div>

      {/* Nome no Cartão */}
      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nome no Cartão</label>
          <div className={containerClass}>
              <input
                type="text"
                id={gateway === 'mercadopago' ? "form-checkout__cardholderName" : undefined}
                className={inputClass}
                placeholder="Como impresso no cartão"
                value={gateway === 'asaas' ? formData.holderName : undefined}
                onChange={gateway === 'asaas' ? (e) => onChange('holderName', e.target.value.toUpperCase()) : undefined}
              />
          </div>
      </div>

      {/* E-mail */}
      <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">E-mail</label>
          <div className={containerClass}>
              <input
                type="email"
                id={gateway === 'mercadopago' ? "form-checkout__cardholderEmail" : undefined}
                className={inputClass}
                defaultValue={userEmail}
                placeholder="exemplo@email.com"
                readOnly
              />
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Banco / Auto Detect */}
        <div className={`space-y-1 ${gateway === 'asaas' ? 'opacity-70 pointer-events-none' : ''}`}>
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Banco</label>
           {gateway === 'mercadopago' ? (
               <select
                  id="form-checkout__issuer"
                  className="w-full h-12 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none appearance-none cursor-pointer truncate"
               ></select>
           ) : (
               <div className="h-12 bg-gray-900 border border-gray-700 rounded-lg flex items-center px-4 text-gray-400 text-sm italic">
                   <i className="fas fa-magic mr-2"></i> Auto-detectar
               </div>
           )}
        </div>

        {/* Parcelas */}
        <div className="space-y-1">
           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Parcelas</label>
           {gateway === 'mercadopago' ? (
               <select
                  id="form-checkout__installments"
                  className="w-full h-12 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none appearance-none cursor-pointer truncate"
               ></select>
           ) : (
               <select
                  className="w-full h-12 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 outline-none appearance-none cursor-pointer truncate"
                  value={formData.installments}
                  onChange={(e) => onChange('installments', e.target.value)}
               >
                   {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                       <option key={n} value={n}>{n}x de R$ {(formData.amount / n).toFixed(2).replace('.', ',')}</option>
                   ))}
               </select>
           )}
        </div>
      </div>

      {/* Campos ocultos MP */}
      {gateway === 'mercadopago' && (
          <div className="hidden">
              <select id="form-checkout__identificationType"></select>
              <input type="text" id="form-checkout__identificationNumber" />
          </div>
      )}
    </div>
  );
};

// --- PIX DISPLAY COMPONENT ---
const PixDisplay = ({ qrCodeBase64, copyPasteCode, onCopy }: { qrCodeBase64: string, copyPasteCode: string, onCopy: () => void }) => {
    return (
        <div className="flex flex-col items-center space-y-6 animate-fade-in py-4">
            <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Escaneie o QR Code abaixo com o app do seu banco:</p>
                <div className="bg-white p-2 rounded-lg inline-block">
                    {/* Exibe QR Code. Se for base64 puro sem prefixo, adiciona. */}
                    <img 
                        src={qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} 
                        alt="QR Code Pix" 
                        className="w-48 h-48 object-contain"
                    />
                </div>
            </div>
            
            <div className="w-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Ou copie o código:</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={copyPasteCode} 
                        readOnly 
                        className="flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono truncate focus:outline-none"
                    />
                    <button 
                        onClick={onCopy}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition whitespace-nowrap"
                    >
                        <i className="fas fa-copy mr-1"></i> Copiar
                    </button>
                </div>
            </div>

            <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-500 text-sm font-bold animate-pulse">
                    <i className="fas fa-spinner fa-spin"></i>
                    Aguardando pagamento...
                </div>
                <p className="text-xs text-gray-500 mt-1">A liberação será automática assim que o pagamento for confirmado.</p>
            </div>
        </div>
    );
};

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
  
  // Define qual gateway usar: Prioridade MP > Asaas
  const [activeGateway, setActiveGateway] = useState<GatewayType>(null);
  
  // Método de pagamento (Card ou Pix)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  
  // Dados do Pix (quando gerado)
  const [pixData, setPixData] = useState<{ qrCode: string, copyPaste: string, id: string } | null>(null);

  // State para formulário (Asaas e CPF compartilhado)
  const [commonFormData, setCommonFormData] = useState({
      docNumber: '', // Novo campo CPF/CNPJ
      cardNumber: '',
      holderName: '',
      expirationDate: '',
      cvv: '',
      installments: '1',
      amount: amount
  });

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const cardFormRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const pollInterval = useRef<any>(null);

  // 1. Determinar Gateway
  useEffect(() => {
      if (mpPublicKey) {
          setActiveGateway('mercadopago');
      } else if (asaasPublicKey) {
          setActiveGateway('asaas');
      } else {
          setFatalError('Nenhum método de pagamento configurado.');
          setLoading(false);
      }
  }, [mpPublicKey, asaasPublicKey]);

  // 2. Atualizar valor em formData se prop mudar e garantir valor > 0
  useEffect(() => {
      const safeAmount = amount > 0 ? amount : 0.01;
      setCommonFormData(prev => ({ ...prev, amount: safeAmount }));
  }, [amount]);

  // 3. Inicialização MP (Apenas se for Cartão e MP)
  useEffect(() => {
    if (!activeGateway || paymentMethod === 'pix') {
        if (activeGateway) setLoading(false);
        return;
    }

    if (activeGateway === 'asaas') {
        setTimeout(() => setLoading(false), 500);
        return;
    }

    // Se for MP e Card, carrega SDK
    const loadMercadoPago = () => {
      // @ts-ignore
      if (window.MercadoPago) {
        initializeMpCardForm();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => { if (mountedRef.current) initializeMpCardForm(); };
      script.onerror = () => { if (mountedRef.current) setFatalError('Erro ao carregar Mercado Pago.'); };
      document.body.appendChild(script);
    };

    const initializeMpCardForm = async () => {
      // Se mudou para Pix e voltou, precisamos garantir que o form anterior morreu
      if (cardFormRef.current) {
          try { cardFormRef.current.unmount(); } catch(e) {}
          cardFormRef.current = null;
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!mountedRef.current || paymentMethod !== 'card') return;

        // @ts-ignore
        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
        const cardForm = mp.cardForm({
          amount: amount.toString(),
          iframe: true,
          autoMount: true, 
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: '0000 0000 0000 0000', style: { color: '#ffffff', fontSize: '16px' } },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: '123', style: { color: '#ffffff', fontSize: '16px' } },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular do cartão' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
            identificationType: { id: 'form-checkout__identificationType' },
            identificationNumber: { id: 'form-checkout__identificationNumber' },
          },
          callbacks: {
            onFormMounted: (err: any) => {
              if (!err && mountedRef.current) setLoading(false);
            },
            onSubmit: (e: any) => handleMpSubmit(e, cardForm),
          },
        });
        cardFormRef.current = cardForm;
      } catch (err) {
        console.error(err);
        setFatalError('Erro ao inicializar formulário MP.');
      }
    };

    if (activeGateway === 'mercadopago') {
        loadMercadoPago();
    }

    return () => {
        if (cardFormRef.current?.unmount) {
            try { cardFormRef.current.unmount(); } catch(e) {}
            cardFormRef.current = null;
        }
    };
  }, [activeGateway, mpPublicKey, amount, paymentMethod]);

  // Cleanup polling on unmount
  useEffect(() => {
      return () => {
          if (pollInterval.current) clearInterval(pollInterval.current);
      };
  }, []);

  // --- POLLING LOGIC ---
  const startPolling = (transactionId: string) => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      
      const checkStatus = async () => {
          try {
              const endpoint = activeGateway === 'mercadopago' ? 'mp-pagar' : 'asaas-pagar';
              const { data: { session } } = await supabase.auth.getSession();
              
              const res = await fetch(`https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/${endpoint}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ check_status_id: transactionId }),
              });
              
              const data = await res.json();
              if (res.ok && (data.status === 'approved' || data.status === 'CONFIRMED' || data.status === 'RECEIVED')) {
                  clearInterval(pollInterval.current);
                  onSuccess();
              }
          } catch (e) {
              console.error("Polling error:", e);
          }
      };

      // Poll every 5 seconds
      pollInterval.current = setInterval(checkStatus, 5000);
  };

  const validateDoc = () => {
      const cleanDoc = commonFormData.docNumber.replace(/\D/g, '');
      
      if (!cleanDoc) {
          setError('CPF/CNPJ é obrigatório.');
          return false;
      }

      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
          setError('Documento inválido. Digite 11 números para CPF ou 14 para CNPJ.');
          return false;
      }

      let valid = false;
      if (cleanDoc.length === 11) valid = isValidCPF(cleanDoc);
      else if (cleanDoc.length === 14) valid = isValidCNPJ(cleanDoc);

      if (!valid) {
          setError('CPF ou CNPJ inválido. Verifique os números digitados.');
          return false;
      }

      return true;
  };

  // --- HANDLERS MP ---
  const handleMpSubmit = async (e: any, cardForm: any) => {
      e.preventDefault();
      if (processing) return;
      if (!validateDoc()) return;

      setProcessing(true);
      setError(null);

      try {
        const { token, error: tokenError } = await cardForm.createCardToken();
        if (tokenError || !token) throw new Error('Verifique os dados do cartão.');

        const formData = cardForm.getCardFormData();
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
                token,
                payment_method_id: formData.paymentMethodId,
                issuer_id: formData.issuerId,
                installments: Number(formData.installments),
                amount: amount,
                user_email: formData.cardholderEmail || user?.email,
                item_type: itemType,
                item_id: itemId,
                docNumber: commonFormData.docNumber.replace(/\D/g, '')
            }),
        });

        const result = await res.json();
        
        if (!res.ok) {
            throw new Error(result.error || result.message || 'Erro no processamento.');
        }

        if (!['approved', 'pending', 'in_process'].includes(result.status)) {
            const statusDetail = result.status_detail;
            const detailedError = 'Pagamento recusado pelo banco emissor.'; 
            throw new Error(detailedError);
        }
        
        onSuccess();
      } catch (err: any) {
        setError(err.message);
        onError(err.message);
      } finally {
        setProcessing(false);
      }
  };

  const handleMpPixGenerate = async () => {
      if (!validateDoc()) return;
      
      setProcessing(true);
      setError(null);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
                amount: amount,
                item_type: itemType,
                item_id: itemId,
                method: 'pix', 
                docNumber: commonFormData.docNumber.replace(/\D/g, '')
            }),
        });

        const result = await res.json();
        if (!res.ok) {
            // Tratamento de erro específico para Invalid Access Token (Unauthorized)
            if (result.code === 'unauthorized' || result.message?.includes('invalid access token')) {
                throw new Error('Erro de Configuração no Servidor: Chave do Mercado Pago inválida.');
            }
            throw new Error(result.error || result.message || 'Erro ao gerar Pix.');
        }
        
        // Verifica se realmente veio o dado do QR Code
        const qrData = result.point_of_interaction?.transaction_data;
        if (!qrData) {
            console.error("MP Response missing QR Data:", result);
            
            // Defesa extra: Se não for 200, exibe o erro retornado
            if (result.message || result.error) {
                 throw new Error(`Gateway: ${result.message || result.error}`);
            }
            
            throw new Error('O Gateway não retornou o Código Pix. Tente novamente mais tarde.');
        }

        setPixData({
            qrCode: qrData.qr_code_base64,
            copyPaste: qrData.qr_code,
            id: result.id.toString()
        });
        
        startPolling(result.id.toString());

      } catch (err: any) {
          setError(err.message);
      } finally {
          setProcessing(false);
      }
  };

  // --- HANDLERS ASAAS ---
  const handleAsaasChange = (field: string, value: string) => {
      setCommonFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAsaasSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (processing) return;
      if (!validateDoc()) return;
      
      const { cardNumber, holderName, expirationDate, cvv, installments, amount: formAmount, docNumber } = commonFormData;
      
      if (cardNumber.length < 16 || holderName.length < 3 || expirationDate.length < 5 || cvv.length < 3) {
          setError('Preencha todos os campos do cartão.');
          return;
      }

      setProcessing(true);
      setError(null);

      try {
          const [month, yearRaw] = expirationDate.split('/');
          const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;

          const payload = {
              amount: Number(formAmount),
              item_type: itemType,
              item_id: itemId,
              installments: Number(installments),
              docNumber: docNumber.replace(/\D/g, ''),
              creditCard: {
                  holderName: holderName,
                  number: cardNumber.replace(/\s/g, ''),
                  expiryMonth: month,
                  expiryYear: year,
                  ccv: cvv
              }
          };
          
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/asaas-pagar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
              body: JSON.stringify(payload),
          });

          const result = await res.json();
          
          if (!res.ok) {
              throw new Error(result.error || 'Erro ao processar pagamento via Asaas.');
          }

          if (result.success === false) {
               throw new Error(result.error || 'Pagamento não autorizado pelo Asaas.');
          }

          onSuccess();

      } catch (err: any) {
          console.error("Erro Pagamento:", err);
          setError(err.message || 'Erro ao processar pagamento.');
          onError(err.message);
      } finally {
          setProcessing(false);
      }
  };

  const handleAsaasPixGenerate = async () => {
      if (!validateDoc()) return;

      setProcessing(true);
      setError(null);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/asaas-pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
                amount: amount,
                item_type: itemType,
                item_id: itemId,
                billingType: 'PIX',
                docNumber: commonFormData.docNumber.replace(/\D/g, '')
            }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao gerar Pix.');
        
        if (!result.qrCode || !result.qrCode.encodedImage) {
             console.error("Asaas missing QR:", result);
             throw new Error('O Gateway não retornou o QR Code. Tente novamente.');
        }

        setPixData({
            qrCode: result.qrCode.encodedImage,
            copyPaste: result.qrCode.payload,
            id: result.paymentId
        });
        
        startPolling(result.paymentId);

      } catch (err: any) {
          setError(err.message);
      } finally {
          setProcessing(false);
      }
  };

  if (fatalError) {
    return (
      <div className="relative max-w-md mx-auto bg-gray-950 p-6 rounded-2xl border border-red-900 shadow-2xl text-center">
        <i className="fas fa-exclamation-triangle text-3xl text-red-500 mb-2"></i>
        <p className="text-red-200 mb-4 text-sm">{fatalError}</p>
        <button onClick={onCancel} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-bold transition">Fechar</button>
      </div>
    );
  }

  return (
    <div className="relative max-w-md mx-auto bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl">
      
      {loading && (
        <div className="absolute inset-0 z-50 bg-gray-950/95 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
            <i className="fas fa-circle-notch fa-spin text-4xl text-green-500 mb-4"></i>
            <p className="text-gray-400 text-sm font-medium animate-pulse">Iniciando pagamento seguro...</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fas fa-lock text-green-500"></i> Checkout
          </h3>
          <p className="text-xs text-gray-500">
              Via {activeGateway === 'mercadopago' ? 'Mercado Pago' : 'Asaas Safe'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400">R$ {amount.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800">
        <i className="fas fa-times text-lg"></i>
      </button>

      {/* Tabs Method Selection */}
      <div className="flex bg-gray-900 p-1 rounded-lg mb-6">
          <button 
            onClick={() => { setPaymentMethod('card'); setPixData(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'card' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <i className="fas fa-credit-card mr-2"></i> Cartão
          </button>
          <button 
            onClick={() => { setPaymentMethod('pix'); setPixData(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'pix' ? 'bg-green-600 text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <i className="fab fa-pix mr-2"></i> Pix
          </button>
      </div>

      {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3">
              <i className="fas fa-times-circle text-red-500 mt-0.5"></i>
              <p className="text-xs text-red-200 leading-relaxed font-bold">{error}</p>
          </div>
      )}

      {/* PAYMENT FORMS */}
      {paymentMethod === 'card' ? (
          <form id="form-checkout" className="space-y-4" onSubmit={activeGateway === 'asaas' ? handleAsaasSubmit : undefined}>
            
            {/* Input para CPF sempre visível (no componente GenericPaymentForm agora) */}
            <GenericPaymentForm 
                gateway={activeGateway} 
                userEmail={user?.email || ''} 
                formData={commonFormData}
                onChange={handleAsaasChange}
            />

            <button
              type="submit"
              disabled={processing || loading}
              className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-green-900/20 transform active:scale-[0.98] mt-6 flex items-center justify-center"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-3">
                  <i className="fas fa-circle-notch fa-spin"></i> Processando...
                </span>
              ) : (
                <> <i className="fas fa-check mr-2"></i> Pagar Agora </>
              )}
            </button>
          </form>
      ) : (
          <div className="space-y-6">
              {!pixData ? (
                  <div className="text-center py-4">
                      <div className="mb-4">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block text-left">CPF ou CNPJ (Obrigatório para Pix)</label>
                          <input
                            type="text"
                            className="w-full h-12 bg-gray-900 border border-gray-700 rounded-lg px-4 text-white focus:border-green-500 focus:outline-none"
                            placeholder="000.000.000-00"
                            value={commonFormData.docNumber}
                            onChange={(e) => handleAsaasChange('docNumber', formatCpfCnpj(e.target.value))}
                            maxLength={18}
                          />
                      </div>

                      <i className="fab fa-pix text-6xl text-green-500 mb-4 animate-bounce"></i>
                      <p className="text-gray-400 text-sm mb-6">
                          Gere um QR Code para pagamento instantâneo. A liberação dos créditos é automática após o pagamento.
                      </p>
                      <button
                          onClick={activeGateway === 'mercadopago' ? handleMpPixGenerate : handleAsaasPixGenerate}
                          disabled={processing}
                          className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-green-900/20"
                      >
                          {processing ? <i className="fas fa-circle-notch fa-spin"></i> : 'Gerar QR Code Pix'}
                      </button>
                  </div>
              ) : (
                  <PixDisplay 
                    qrCodeBase64={pixData.qrCode} 
                    copyPasteCode={pixData.copyPaste} 
                    onCopy={() => {
                        navigator.clipboard.writeText(pixData.copyPaste);
                        alert('Código Pix copiado!');
                    }}
                  />
              )}
          </div>
      )}
      
      <p className="text-[10px] text-gray-600 text-center mt-6">
          Ambiente seguro 256-bit SSL. {activeGateway === 'asaas' ? 'Processado por Asaas.' : 'Processado por Mercado Pago.'}
      </p>
    </div>
  );
}