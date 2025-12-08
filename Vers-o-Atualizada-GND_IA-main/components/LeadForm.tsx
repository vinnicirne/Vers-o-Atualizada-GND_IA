
import React, { useState, useEffect } from 'react';
import { createLead } from '../services/adminService';
import { trackEvent } from '../services/trackingService';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

interface LeadFormProps {
  redirectUrl?: string;
  source?: string;
  buttonText?: string;
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export function LeadForm({ 
    redirectUrl = '/?page=obrigado', 
    source = 'landing_page', 
    buttonText = 'Baixar Material Gratuito',
    title = 'Cadastre-se para receber',
    subtitle,
    onSuccess 
}: LeadFormProps) {
  const { settings } = useWhiteLabel();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
      nome: '',
      email: '',
      telefone: '',
      empresa: '',
      consentimento: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.email || !formData.nome) return;
      
      if (!formData.consentimento) {
          alert("É necessário aceitar os termos para continuar.");
          return;
      }

      setLoading(true);
      try {
          // 1. Rastreamento de Tentativa
          trackEvent('submit_form', undefined, { step: 'start', form: source });

          // 2. Criação do Lead (Supabase + Envio de Email via Edge Function)
          const lead = await createLead({
              ...formData,
              utm_source: sessionStorage.getItem('utm_source') || 'direct',
              utm_medium: sessionStorage.getItem('utm_medium') || '',
              utm_campaign: sessionStorage.getItem('utm_campaign') || '',
              fonte: source
          });

          // 3. Rastreamento de Sucesso
          if(lead) {
              trackEvent('submit_form', lead.id, { step: 'success', form: source });
          }

          // 4. Redirecionamento ou Callback
          if (onSuccess) onSuccess();
          if (redirectUrl) window.location.href = redirectUrl;

      } catch (err) {
          console.error("Erro no formulário:", err);
          alert("Ocorreu um erro ao processar seus dados. Tente novamente.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-auto">
        {(title || subtitle) && (
            <div className="text-center mb-6">
                {title && <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>}
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                <input 
                    type="text" 
                    name="nome" 
                    value={formData.nome} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition" 
                    placeholder="Seu nome" 
                    required 
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail Corporativo</label>
                <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition" 
                    placeholder="seu@email.com" 
                    required 
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                <input 
                    type="tel" 
                    name="telefone" 
                    value={formData.telefone} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition" 
                    placeholder="(XX) 99999-9999" 
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Empresa (Opcional)</label>
                <input 
                    type="text" 
                    name="empresa" 
                    value={formData.empresa} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition" 
                    placeholder="Nome da sua empresa" 
                />
            </div>

            <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            name="consentimento" 
                            checked={formData.consentimento} 
                            onChange={handleInputChange} 
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 shadow transition-all checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] hover:shadow-md" 
                        />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                            <i className="fas fa-check text-[10px]"></i>
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-gray-700 transition leading-tight">
                        Concordo em receber comunicações e materiais educativos. Posso cancelar a inscrição a qualquer momento.
                    </span>
                </label>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[var(--brand-primary)]/20 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                style={{ backgroundColor: settings.primaryColorHex }}
            >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-download"></i> {buttonText}</>}
            </button>
            
            <p className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
                <i className="fas fa-lock"></i> Seus dados estão seguros.
            </p>
        </form>
    </div>
  );
}
