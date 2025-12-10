
import React from 'react';
import { PLANS } from '../constants';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { settings } = useWhiteLabel();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[var(--brand-tertiary)] rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[var(--brand-tertiary)]/30">
              <i className="fas fa-robot"></i>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[var(--brand-secondary)]">{settings.logoTextPart1}<span className="text-[var(--brand-primary)]">{settings.logoTextPart2}</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate(settings.heroCtaSecondaryLink as any)} className="text-gray-600 hover:text-[var(--brand-primary)] font-medium px-4 py-2 transition">
              {settings.heroCtaSecondaryText}
            </button>
            <button onClick={() => onNavigate(settings.heroCtaPrimaryLink as any)} className="bg-[var(--brand-primary)] hover:bg-orange-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-[var(--brand-primary)]/30 transition transform hover:-translate-y-0.5">
              {settings.heroCtaPrimaryText}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-[var(--brand-tertiary)]/[0.1] text-[var(--brand-tertiary)] text-xs font-bold tracking-wide uppercase mb-6 animate-fade-in-up">
            🚀 A Revolução da Criação de Conteúdo
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[var(--brand-secondary)] mb-8 leading-tight animate-fade-in-up">
            {settings.heroSectionTitle.split('10x Mais Rápido com IA.')[0]}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-tertiary)] to-emerald-400">10x Mais Rápido com IA.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            {settings.heroSectionSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-200">
            <button onClick={() => onNavigate(settings.heroCtaPrimaryLink as any)} className="px-8 py-4 bg-[var(--brand-primary)] hover:bg-orange-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-[var(--brand-primary)]/30 transition transform hover:scale-105 flex items-center justify-center gap-2">
              <i className="fas fa-magic"></i> {settings.heroCtaPrimaryText}
            </button>
            <button onClick={() => onNavigate(settings.heroCtaSecondaryLink as any)} className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2">
              <i className="fas fa-play"></i> {settings.heroCtaSecondaryText}
            </button>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--brand-tertiary)]/[0.2] rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--brand-primary)]/[0.2] rounded-full blur-3xl opacity-30 animate-pulse delay-700"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--brand-secondary)] mb-4">{settings.featureSectionTitle}</h2>
            <p className="text-gray-500">{settings.featureSectionSubtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {settings.landingPageFeatures.map((feature, index) => (
              <FeatureCard 
                key={index}
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--brand-secondary)] mb-4">{settings.pricingSectionTitle}</h2>
            <p className="text-gray-500">{settings.pricingSectionSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {Object.values(PLANS).map((plan) => (
              <div key={plan.id} className={`p-8 rounded-2xl border ${plan.name === 'Premium' ? 'border-[var(--brand-primary)] shadow-2xl relative' : 'border-gray-200 shadow-sm'} flex flex-col`}>
                {plan.name === 'Premium' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--brand-primary)] text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                        Mais Popular
                    </div>
                )}
                <h3 className="text-xl font-bold text-[var(--brand-secondary)] mb-2">{plan.name}</h3>
                <div className="mb-6">
                    <span className="text-4xl font-bold text-[var(--brand-secondary)]">
                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(0)}`}
                    </span>
                    {plan.price > 0 && <span className="text-gray-500">/mês</span>}
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-check text-[var(--brand-tertiary)] mr-2"></i> 
                        {plan.credits === -1 ? 'Créditos Ilimitados' : <strong>{plan.credits} Créditos mensais</strong>}
                    </li>
                    {plan.services.map(svc => (
                        <li key={svc.key} className={`flex items-center text-sm ${svc.enabled ? 'text-gray-600' : 'text-gray-300 line-through'}`}>
                            <i className={`fas ${svc.enabled ? 'fa-check text-[var(--brand-tertiary)]' : 'fa-times text-gray-300'} mr-2`}></i>
                            {svc.name}
                        </li>
                    ))}
                </ul>

                <button 
                    onClick={() => onNavigate('login')}
                    className={`w-full py-3 rounded-xl font-bold transition ${plan.name === 'Premium' ? 'bg-[var(--brand-primary)] text-white hover:bg-orange-500' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                    Escolher {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--brand-primary)] rounded flex items-center justify-center font-bold">{settings.logoTextPart1.charAt(0)}</div>
                <span className="font-bold text-xl">{settings.appName}</span>
            </div>
            <div className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} {settings.copyrightText}. Todos os direitos reservados.
            </div>
            <div className="flex gap-6">
                {settings.landingPageFooterLinks.map((link, index) => (
                    <button key={index} onClick={() => onNavigate(link.link as any)} className="text-gray-400 hover:text-white text-sm">{link.text}</button>
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
            <h3 className="text-xl font-bold text-[var(--brand-secondary)] mb-3">{title}</h3>
            <p className="text-gray-500 leading-relaxed">{desc}</p>
        </div>
    );
}

export default LandingPage;
