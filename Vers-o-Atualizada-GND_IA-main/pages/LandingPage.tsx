
import React, { useEffect } from 'react';
import { PLANS } from '../constants';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { Plan } from '../types/plan.types';
import { trackEvent } from '../services/trackingService';
import { LeadForm } from '../components/LeadForm';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { settings } = useWhiteLabel();
  
  // Capture UTMs on Load
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('utm_source')) sessionStorage.setItem('utm_source', params.get('utm_source')!);
      if (params.has('utm_medium')) sessionStorage.setItem('utm_medium', params.get('utm_medium')!);
      if (params.has('utm_campaign')) sessionStorage.setItem('utm_campaign', params.get('utm_campaign')!);
      
      trackEvent('view_landing');
  }, []);

  const handleNavigateToCheckout = (planId: string) => {
      trackEvent('checkout_view', undefined, { plan_id: planId });
      onNavigate('login');
  };

  // Função auxiliar para renderizar botões com as cores do tema
  const PrimaryButton = ({ onClick, children, className = '' }: any) => (
    <button 
        onClick={onClick} 
        className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition transform hover:scale-105 flex items-center justify-center gap-2 text-white ${className}`}
        style={{ backgroundColor: settings.primaryColorHex }}
    >
        {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ backgroundColor: settings.primaryColorHex }}>
                {settings.faviconUrl ? <img src={settings.faviconUrl} alt="Icon" className="w-6 h-6 brightness-0 invert" /> : <i className="fas fa-robot"></i>}
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
                <span style={{ color: settings.secondaryColorHex }}>{settings.logoTextPart1}</span>
                <span style={{ color: settings.primaryColorHex }}>{settings.logoTextPart2}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('login')} className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 transition hidden md:block">
              Entrar
            </button>
            <button 
                onClick={() => onNavigate('login')} 
                className="text-white px-6 py-2.5 rounded-full font-bold shadow-lg transition transform hover:-translate-y-0.5"
                style={{ backgroundColor: settings.primaryColorHex }}
            >
              Testar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block py-1 px-3 rounded-full text-xs font-bold tracking-wide uppercase mb-6 animate-fade-in-up" style={{ backgroundColor: `${settings.primaryColorHex}20`, color: settings.primaryColorHex }}>
            🚀 {settings.appTagline || "A Revolução da Criação de Conteúdo"}
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight animate-fade-in-up whitespace-pre-wrap">
            {settings.heroSectionTitle}
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100 whitespace-pre-wrap">
            {settings.heroSectionSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-200">
            <PrimaryButton onClick={() => onNavigate(settings.heroCtaPrimaryLink || 'dashboard')}>
              <i className="fas fa-magic"></i> {settings.heroCtaPrimaryText}
            </PrimaryButton>
            <button 
                onClick={() => onNavigate(settings.heroCtaSecondaryLink || 'login')} 
                className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-play"></i> {settings.heroCtaSecondaryText}
            </button>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-30 animate-pulse" style={{ backgroundColor: settings.primaryColorHex }}></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse delay-700" style={{ backgroundColor: settings.tertiaryColorHex }}></div>
        </div>
      </section>

      {/* LEAD MAGNET / NEWSLETTER SECTION */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden" id="newsletter">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="max-w-6xl mx-auto px-4 relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div className="text-left">
                  <span className="text-[var(--brand-tertiary)] font-bold tracking-widest text-sm uppercase mb-2 block" style={{ color: settings.tertiaryColorHex }}>Material Gratuito</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">Quer dominar a IA e criar prompts perfeitos?</h2>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                      Baixe nosso <strong>Guia Definitivo de Engenharia de Prompts</strong>. Aprenda a estrutura secreta para extrair os melhores resultados do ChatGPT, Gemini e Claude em minutos.
                  </p>
                  <ul className="space-y-4">
                      <li className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center"><i className="fas fa-check text-xs"></i></div>
                          <span>Templates Prontos para Copiar e Colar</span>
                      </li>
                      <li className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center"><i className="fas fa-check text-xs"></i></div>
                          <span>Fórmulas de Criação de Conteúdo Viral</span>
                      </li>
                      <li className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center"><i className="fas fa-check text-xs"></i></div>
                          <span>Checklist de Otimização de SEO</span>
                      </li>
                  </ul>
              </div>
              
              <div>
                  <LeadForm 
                    title="Baixar Guia Gratuito"
                    subtitle="Preencha para receber no seu e-mail agora."
                    buttonText="Quero meu Guia"
                    source="lp_hero_magnet"
                    onSuccess={() => onNavigate('obrigado')} // Navega para rota interna
                  />
              </div>
          </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{settings.featureSectionTitle}</h2>
            <p className="text-gray-500">{settings.featureSectionSubtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {settings.landingPageFeatures.map((feature) => (
                <FeatureCard 
                    key={feature.id}
                    icon={feature.icon} 
                    color={feature.color} 
                    bg={feature.bgColor}
                    title={feature.title} 
                    desc={feature.description}
                />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{settings.pricingSectionTitle}</h2>
            <p className="text-gray-500">{settings.pricingSectionSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {Object.values(PLANS).map((plan: Plan) => (
              <div key={plan.id} className={`p-8 rounded-2xl border ${plan.name === 'Premium' ? 'shadow-2xl relative' : 'border-gray-200 shadow-sm'} flex flex-col`} style={plan.name === 'Premium' ? { borderColor: settings.primaryColorHex } : {}}>
                {plan.name === 'Premium' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: settings.primaryColorHex }}>
                        Mais Popular
                    </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(0)}`}
                    </span>
                    {plan.price > 0 && <span className="text-sm text-gray-500">/mês</span>}
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-check mr-2" style={{ color: settings.primaryColorHex }}></i> 
                        {plan.credits === -1 ? 'Créditos Ilimitados' : <strong>{plan.credits} Créditos mensais</strong>}
                    </li>
                    {plan.services.map(svc => (
                        <li key={svc.key} className={`flex items-center text-sm ${svc.enabled ? 'text-gray-600' : 'text-gray-300 line-through'}`}>
                            <i className={`fas ${svc.enabled ? 'fa-check' : 'fa-times'} mr-2`} style={{ color: svc.enabled ? settings.primaryColorHex : undefined }}></i>
                            {svc.name}
                        </li>
                    ))}
                </ul>

                <button 
                    onClick={() => handleNavigateToCheckout(plan.id)}
                    className={`w-full py-3 rounded-xl font-bold transition ${plan.name === 'Premium' ? 'text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    style={plan.name === 'Premium' ? { backgroundColor: settings.primaryColorHex } : {}}
                >
                    Escolher {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-12" style={{ backgroundColor: settings.secondaryColorHex }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded flex items-center justify-center font-bold" style={{ backgroundColor: settings.primaryColorHex }}>
                    {settings.logoTextPart1.charAt(0)}
                </div>
                <span className="font-bold text-xl">{settings.appName}</span>
            </div>
            <div className="text-sm text-gray-400">
                {settings.copyrightText}
            </div>
            <div className="flex gap-6">
                {settings.landingPageFooterLinks.map(link => (
                    <button key={link.id} onClick={() => onNavigate(link.link)} className="text-gray-400 hover:text-white text-sm transition">
                        {link.text}
                    </button>
                ))}
            </div>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({ icon, title, desc, color, bg }: { icon: string, title: string, desc: string, color: string, bg: string }) {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition duration-300">
            <div className={`w-14 h-14 ${bg} ${color} rounded-xl flex items-center justify-center text-2xl mb-6`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
            <p className="text-gray-500 leading-relaxed">{desc}</p>
        </div>
    );
}

export default LandingPage;
