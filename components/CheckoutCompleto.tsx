import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

// --- Helpers para CPF/CNPJ ---
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

// --- Componente Pix QR ---
const PixDisplay = ({ qrCodeBase64, copyPasteCode, onCopy }: { qrCodeBase64: string, copyPasteCode: string, onCopy: () => void }) => (
  <div className="flex flex-col items-center space-y-6 py-4">
    <div className="bg-white p-2 rounded-lg inline-block">
      <img
        src={qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
        alt="QR Code Pix"
        className="w-48 h-48 object-contain"
      />
    </div>
    <div className="w-full">
      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ou copie o código:</label>
      <div className="flex gap-2">
        <input type="text" value={copyPasteCode} readOnly className="flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono truncate" />
        <button onClick={onCopy} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs">
          <i className="fas fa-copy mr-1"></i> Copiar
        </button>
      </div>
    </div>
    <div className="text-yellow-500 text-sm font-bold animate-pulse flex items-center gap-2">
      <i className="fas fa-spinner fa-spin"></i> Aguardando pagamento...
    </div>
  </div>
);

// --- Componente principal ---
export default function CheckoutCompleto({
  amount,
  itemType,
  itemId,
  mpPublicKey,
  asaasPublicKey,
  onSuccess,
  onError,
  onCancel,
}) {
  const { user } = useUser();
  const [activeGateway, setActiveGateway] = useState<'mercadopago' | 'asaas' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('pix');
  const [pixData, setPixData] = useState<{ qrCode: string, copyPaste: string, id: string } | null>(null);
  const [commonFormData, setCommonFormData] = useState({ docNumber: '', amount });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    if (mpPublicKey) setActiveGateway('mercadopago');
    else if (asaasPublicKey) setActiveGateway('asaas');
  }, [mpPublicKey, asaasPublicKey]);

  const validateDoc = () => {
    const cleanDoc = commonFormData.docNumber.replace(/\D/g, '');
    if (!cleanDoc) { setError('CPF/CNPJ é obrigatório.'); return false; }
    if (cleanDoc.length === 11 && !isValidCPF(cleanDoc)) { setError('CPF inválido.'); return false; }
    if (cleanDoc.length === 14 && !isValidCNPJ(cleanDoc)) { setError('CNPJ inválido.'); return false; }
    return true;
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

  // --- Pix Mercado Pago ---
  const handleMpPixGenerate = async () => {
    if (!validateDoc()) return;
    setProcessing(true); setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cleanDoc = commonFormData.docNumber.replace(/\D/g, '');
      const docType = cleanDoc.length === 11 ? 'CPF' : 'CNPJ';

      const payload = {
        transaction_amount: amount,
        description: itemType === 'plan' ? 'Pagamento de plano' : 'Compra de créditos',
        item_id: itemId,
        payment_method_id: 'pix',
        payer: {
          email: user?.email || 'teste@email.com',
          identification: { type: docType, number: cleanDoc }
        }
      };

      const res = await fetch('https://bckujotuhhkagcqfiyye.supabase.co/functions/v1/mp-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || 'Erro ao gerar Pix.');

      const qrData = result.point_of_interaction?.transaction_data;
      if (!qrData) throw new Error('O Gateway não retornou o Código Pix. Verifique se o CPF/Email é válido.');

      setPixData({ qrCode: qrData.qr_code_base64