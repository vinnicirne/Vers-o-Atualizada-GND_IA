import React, { useState, useEffect, useRef } from 'react';
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

// --- Helpers para CPF/CNPJ (Lógica Refatorada) ---
function isValidCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  const cpfDigits = cpf.split('').map(el => +el);
  const rest = (count: number) =>
    (cpfDigits.slice(0, count - 12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10;
  return rest(10) === cpfDigits[9] && rest(11) === cpfDigits[10];
}

function isValidCNPJ(cnpj: string) {
  const s = cnpj.replace(/[^\d]+/g, '');
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
  let tamanho = s.length - 2;
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
  return resultado == parseInt(digitos.charAt(1));
}

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

const formatCardNumber = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19);
};

const formatExpiration = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
};

// --- Componente Pix QR ---
const PixDisplay = ({ qrCodeBase64, copyPasteCode, onCopy }: { qrCodeBase64: string, copyPasteCode: string, onCopy: () => void }) => (
  <div className="flex flex-col items-center space-y-6 py-4 animate-fade-in">
    <div className="bg-white p-2 rounded-lg inline-block shadow-lg">
      <img
        src={qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
        alt="QR Code Pix"
        className="w-48 h-48 object-contain"
      />
    </div>
    <div className="w-full">
      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ou copie o código:</label>
      <div className="flex gap-2">
        <input 
            type="text" 
            value={copyPasteCode} 
            readOnly 
            className="flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono truncate focus:outline-none" 
        />
        <button onClick={onCopy} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2">
          <i className="fas fa-copy"></i> Copiar
        </button>
      </div>
    </div>
    <div className="text-yellow-500 text-sm font-bold animate-pulse flex items-center gap-2 bg-yellow-900/10 px-4 py-2 rounded-lg">
      <i className="fas fa-spinner fa-spin"></i> Aguardando confirmação do pagamento...
    </div>
  </div>
);

// --- Formulário de Inputs (Reutilizado para manter estilo) ---
const GenericPaymentForm = ({ formData, onChange }: { formData: any, onChange: (field: string, value: string) => void }) => {
    const inputClass = "w-full h-12 bg-gray-900 border border-gray-700 rounded-lg px-4 text-white focus:border-green-500 focus:outline-none text-sm transition-colors";
    
    return (
        <div className="space-y-4 animate-fade-in">
            {/* CPF/CNPJ sempre visível */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CPF ou CNPJ</label>
                <input
                    type="text"
                    className={inputClass}
                    placeholder="000.000.000-00"
                    value={formData.docNumber}
                    onChange={(e) => onChange('docNumber', formatCpfCnpj(e.target.value))}
                    maxLength={18}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Número do Cartão</label>
                <input
                    type="text"
                    className={inputClass}
                    placeholder="0000 0000 0000 0000"
                    value={formData.cardNumber}
                    onChange={(e) => onChange('cardNumber', formatCardNumber(e.target.value))}
                    maxLength={19}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Validade</label>
                    <input
                        type="text"
                        className={inputClass}
                        placeholder="MM/AA"
                        value={formData.expirationDate}
                        onChange={(e) => onChange('expirationDate', formatExpiration(e.target.value))}
                        maxLength={5}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CVV</label>
                    <input
                        type="text"
                        className={inputClass}
                        placeholder="123"
                        value={formData.cvv}
                        onChange={(e) => onChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
                        maxLength={4}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome no Cartão</label>
                <input
                    type="text"
                    className={inputClass}
                    placeholder="Como impresso no cartão"
                    value={formData.holderName}
                    onChange={(e) => onChange('holderName', e.target.value.toUpperCase())}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Parcelas</label>
                <select
                    className={inputClass}
                    value={formData.installments}
                    onChange={(e) => onChange('installments', e.target.value)}
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <option key={n} value={n}>{n}x de R$ {(formData.amount / n).toFixed(2).replace('.', ',')}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// --- Componente Principal ---
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
  const [activeGateway, setActiveGateway] = useState<'mercadopago' | 'asaas' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [pixData, setPixData] = useState<{ qrCode: string, copyPaste: string, id: string } | null>(null);
  
  // State único para todo o form
  const [commonFormData, setCommonFormData] = useState({ 
      docNumber: '', 
      cardNumber: '',
      holderName: '',
      expirationDate: '',
      cvv: '',
      installments: '1',
      amount 
  });
  
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true); // Loading inicial de config
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  
  const pollInterval = useRef<any>(null);
  const cardFormRef = useRef<any>(null); // Ref para MP SDK se necessário (mantido para compatibilidade futura)

  useEffect(() => {
    if (mpPublicKey) {
        setActiveGateway('mercadopago');
        setLoading(false);
    } else if (asaasPublicKey) {
        setActiveGateway('asaas');
        setLoading(false);
    } else {
        setFatalError('Nenhum método de pagamento configurado.');
        setLoading(false);
    }
  }, [mpPublicKey, asaasPublicKey]);

  useEffect(() => {
      setCommonFormData(prev => ({ ...prev, amount }));
  }, [amount]);

  // Limpa polling ao desmontar
  useEffect(() => {
      return () => {
          if (pollInterval.current) clearInterval(pollInterval.current);
      };
  }, []);

  const handleInputChange = (field: string, value: string) => {
      setCommonFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateDoc = () => {
    const cleanDoc = commonFormData.docNumber.replace(/\D/g, '');
    
    if (!cleanDoc) { 
        setError('CPF/CNPJ é obrigatório.'); 
        return false; 
    }
    
    // Validação estrita de comprimento + algoritmo
    if (cleanDoc.length === 11) {
        if (!isValidCPF(cleanDoc)) {
            setError('CPF inválido. Verifique os números.');
            return false;
        }
        return true;
    }
    
    if (cleanDoc.length === 14) {
        if (!isValidCNPJ(cleanDoc)) {
            setError('CNPJ inválido. Verifique os números.');
            return false;
        }
        return true;
    }

    setError('Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos.');
    return false;
  };

  const startPolling = (transactionId: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    pollInterval.current = setInterval(async () => {
      try {
        const endpoint = activeGateway === 'mercadopago' ? 'mp-pagar' : 'asaas-pagar';
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch(`https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ check_status_id: transactionId }),
        });
        
        const data = await res.json();
        if (res.ok && ['approved', 'CONFIRMED', 'RECEIVED'].includes(data.status)) {
          clearInterval(pollInterval.current);
          onSuccess();
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 5000);
  };

  // --- Geração de Pix (MP) ---
  const handleMpPixGenerate = async () => {
    if (!validateDoc()) return;
    setProcessing(true); 
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cleanDoc = commonFormData.docNumber.replace(/\D/g, '');
      
      const payload = {
        amount: amount,
        item_type: itemType,
        item_id: itemId,
        method: 'pix', 
        payment_method_id: 'pix', // Obrigatório para MP
        docNumber: cleanDoc
      };

      const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      
      if (!res.ok) {
          throw new Error(result.error || result.message || 'Erro ao gerar Pix.');
      }

      const qrData = result.point_of_interaction?.transaction_data;
      if (!qrData) {
          console.error("MP Response missing QR:", result);
          throw new Error('O Gateway não retornou o Código Pix. Tente novamente.');
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

  // --- Geração de Pix (Asaas) ---
  const handleAsaasPixGenerate = async () => {
      if (!validateDoc()) return;
      setProcessing(true);
      setError(null);

      try {
          const { data: { session } } = await supabase.auth.getSession();
          const cleanDoc = commonFormData.docNumber.replace(/\D/g, '');

          const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/asaas-pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
                amount: amount,
                item_type: itemType,
                item_id: itemId,
                billingType: 'PIX',
                docNumber: cleanDoc
            }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao gerar Pix.');
        
        if (!result.qrCode || !result.qrCode.encodedImage) {
             throw new Error('QR Code não retornado pelo Asaas.');
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

  // --- Pagamento com Cartão (Genérico MP/Asaas via Backend) ---
  const handleCardSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (processing) return;
      if (!validateDoc()) return;
      
      const { cardNumber, holderName, expirationDate, cvv, installments, amount: formAmount, docNumber } = commonFormData;
      const cleanCard = cardNumber.replace(/\s/g, '');
      
      if (cleanCard.length < 16 || holderName.length < 3 || expirationDate.length < 5 || cvv.length < 3) {
          setError('Preencha todos os campos do cartão corretamente.');
          return;
      }

      setProcessing(true);
      setError(null);

      try {
          const [month, yearRaw] = expirationDate.split('/');
          const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
          const cleanDoc = docNumber.replace(/\D/g, '');

          const payload = {
              amount: Number(formAmount),
              item_type: itemType,
              item_id: itemId,
              installments: Number(installments),
              docNumber: cleanDoc,
              // Dados de cartão enviados ao backend para tokenização segura (Asaas) ou processamento (MP)
              creditCard: {
                  holderName: holderName,
                  number: cleanCard,
                  expiryMonth: month,
                  expiryYear: year,
                  ccv: cvv
              }
          };
          
          const endpoint = activeGateway === 'mercadopago' ? 'mp-pagar' : 'asaas-pagar';
          const { data: { session } } = await supabase.auth.getSession();
          
          const res = await fetch(`https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
              body: JSON.stringify(payload),
          });

          const result = await res.json();
          
          if (!res.ok) {
              throw new Error(result.error || result.message || 'Erro no processamento do pagamento.');
          }

          if (result.success === false && result.status !== 'approved') {
               throw new Error(result.error || 'Pagamento não autorizado.');
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
            <p className="text-gray-400 text-sm font-medium animate-pulse">Iniciando...</p>
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

      <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition">
        <i className="fas fa-times text-lg"></i>
      </button>

      {/* Tabs Method Selection */}
      <div className="flex bg-gray-900 p-1 rounded-lg mb-6">
          <button 
            onClick={() => { setPaymentMethod('card'); setPixData(null); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'card' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <i className="fas fa-credit-card mr-2"></i> Cartão
          </button>
          <button 
            onClick={() => { setPaymentMethod('pix'); setPixData(null); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'pix' ? 'bg-green-600 text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <i className="fab fa-pix mr-2"></i> Pix
          </button>
      </div>

      {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3 animate-fade-in">
              <i className="fas fa-times-circle text-red-500 mt-0.5"></i>
              <p className="text-xs text-red-200 leading-relaxed font-bold">{error}</p>
          </div>
      )}

      {/* RENDER FORMS */}
      {paymentMethod === 'card' ? (
          <form onSubmit={handleCardSubmit}>
            <GenericPaymentForm formData={commonFormData} onChange={handleInputChange} />
            <button
              type="submit"
              disabled={processing}
              className="w-full mt-6 py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-green-900/20 transform active:scale-[0.98] flex items-center justify-center"
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
                  <div className="text-center py-4 animate-fade-in">
                      <div className="mb-4 text-left">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">CPF ou CNPJ (Obrigatório para Pix)</label>
                          <input
                            type="text"
                            className="w-full h-12 bg-gray-900 border border-gray-700 rounded-lg px-4 text-white focus:border-green-500 focus:outline-none transition-colors"
                            placeholder="000.000.000-00"
                            value={commonFormData.docNumber}
                            onChange={(e) => handleInputChange('docNumber', formatCpfCnpj(e.target.value))}
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
                          className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
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