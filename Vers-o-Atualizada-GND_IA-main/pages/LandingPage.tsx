
import React from 'react';
import { PLANS } from '../constants';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-green-200">
              <i className="fas fa-robot"></i>
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">GDN<span className="text-green-600">_IA</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('login')} className="text-gray-600 hover:text-green-600 font-medium px-4 py-2 transition">
              Entrar
            </button>
            <button onClick={() => onNavigate('login')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-green-200 transition transform hover:-translate-y-0.5">
              Testar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-bold tracking-wide uppercase mb-6 animate-fade-in-up">
            🚀 A Revolução da Criação de Conteúdo
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight animate-fade-in-up">
            Crie Notícias, Imagens e Sites <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400">10x Mais Rápido com IA.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto animate-fade-in-up delay-100">
            A plataforma completa para criadores, jornalistas e agências. Esqueça o bloqueio criativo e produza conteúdo profissional em segundos.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-200">
            <button onClick={() => onNavigate('dashboard')} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-green-200 transition transform hover:scale-105 flex items-center justify-center gap-2">
              <i className="fas fa-magic"></i> Começar Agora
            </button>
            <button onClick={() => onNavigate('login')} className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2">
              <i className="fas fa-play"></i> Ver Demo
            </button>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-30 animate-pulse delay-700"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo o que você precisa em um só lugar</h2>
            <p className="text-gray-500">Substitua dezenas de ferramentas caras por uma única suíte inteligente.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="fa-newspaper" 
              color="text-green-600" 
              bg="bg-green-100"
              title="Gerador de Notícias" 
              desc="Artigos jornalísticos completos, imparciais e otimizados para SEO, baseados em fatos reais e recentes."
            />
            <FeatureCard 
              icon="fa-paint-brush" 
              color="text-purple-600" 
              bg="bg-purple-100"
              title="Studio de Arte IA" 
              desc="Crie imagens ultra-realistas, logotipos e ilustrações apenas descrevendo o que você imagina."
            />
            <FeatureCard 
              icon="fa-laptop-code" 
              color="text-blue-600" 
              bg="bg-blue-100"
              title="Criador de Sites" 
              desc="Gere Landing Pages e Sites Institucionais completos com código HTML/Tailwind pronto para uso."
            />
            <FeatureCard 
              icon="fa-microphone-lines" 
              color="text-orange-600" 
              bg="bg-orange-100"
              title="Texto para Voz" 
              desc="Narre seus artigos e vídeos com vozes neurais ultra-realistas em português."
            />
            <FeatureCard 
              icon="fa-bolt" 
              color="text-yellow-600" 
              bg="bg-yellow-100"
              title="Automação N8N" 
              desc="Conecte seu conteúdo diretamente ao seu WordPress, redes sociais ou planilhas via Webhooks."
            />
            <FeatureCard 
              icon="fa-search" 
              color="text-pink-600" 
              bg="bg-pink-100"
              title="SEO Automático" 
              desc="Nossa IA analisa e otimiza seu texto para rankear no topo do Google automaticamente."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Planos acessíveis para todos</h2>
            <p className="text-gray-500">Comece grátis e escale conforme sua necessidade.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {Object.values(PLANS).map((plan) => (
              <div key={plan.id} className={`p-8 rounded-2xl border ${plan.name === 'Premium' ? 'border-green-500 shadow-2xl relative' : 'border-gray-200 shadow-sm'} flex flex-col`}>
                {plan.name === 'Premium' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                        Mais Popular
                    </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(0)}`}
                    </span>
                    {plan.price > 0 && <span className="text-gray-500">/mês</span>}
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-check text-green-500 mr-2"></i> 
                        {plan.credits === -1 ? 'Créditos Ilimitados' : <strong>{plan.credits} Créditos mensais</strong>}
                    </li>
                    {plan.services.map(svc => (
                        <li key={svc.key} className={`flex items-center text-sm ${svc.enabled ? 'text-gray-600' : 'text-gray-300 line-through'}`}>
                            <i className={`fas ${svc.enabled ? 'fa-check text-green-500' : 'fa-times text-gray-300'} mr-2`}></i>
                            {svc.name}
                        </li>
                    ))}
                </ul>

                <button 
                    onClick={() => onNavigate('login')}
                    className={`w-full py-3 rounded-xl font-bold transition ${plan.name === 'Premium' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
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
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center font-bold">G</div>
                <span className="font-bold text-xl">GDN_IA</span>
            </div>
            <div className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} GDN_IA. Todos os direitos reservados.
            </div>
            <div className="flex gap-6">
                <button onClick={() => onNavigate('terms')} className="text-gray-400 hover:text-white text-sm">Termos</button>
                <button onClick={() => onNavigate('privacy')} className="text-gray-400 hover:text-white text-sm">Privacidade</button>
                <button onClick={() => onNavigate('about')} className="text-gray-400 hover:text-white text-sm">Sobre</button>
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
