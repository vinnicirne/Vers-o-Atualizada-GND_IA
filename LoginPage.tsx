
import React from 'react';
import { LoginForm } from './components/auth/LoginForm'; // Import the new form component

function LoginPage() {
  const features = [
    { icon: 'fa-clock', title: 'Notícias em Tempo Real', description: 'Cobertura de eventos das últimas 48 horas com fontes da web.' },
    { icon: 'fa-wand-magic-sparkles', title: 'Análises Preditivas', description: 'Explore tendências e cenários futuros com análises baseadas em dados.' },
    { icon: 'fa-feather-alt', title: 'Conteúdo Otimizado', description: 'Artigos imparciais e bem estruturados, prontos para publicação.' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#ECEFF1] font-['Poppins'] text-[#263238]">
      <div className="grid lg:grid-cols-2 min-h-screen">
         {/* Coluna Esquerda/Topo: Landing Info */}
         <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 lg:border-r lg:border-[#CFD8DC] bg-white lg:bg-transparent">
          <div className="max-w-md mx-auto lg:mx-0 animate-fade-in-up">
            <div className="text-4xl font-bold tracking-widest mb-6 text-center lg:text-left">
              <span className="text-[#263238]">GDN</span>
              <span className="text-[#F39C12]">_IA</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-[#263238]">
                O Futuro das Notícias,
                <span className="text-[#F39C12]"> Hoje.</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Gere artigos sobre eventos recentes ou explore cenários futuros com nossa inteligência artificial avançada.
              </p>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-white shadow-sm border border-[#CFD8DC]">
                    <div className="mt-1"><i className={`fas ${feature.icon} text-xl text-[#F39C12]`}></i></div>
                    <div>
                      <h3 className="font-bold text-[#263238]">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita/Baixo: Formulário de Login */}
        <div className="flex items-center justify-center p-4 bg-[#ECEFF1]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;