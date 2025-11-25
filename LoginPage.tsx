


import React from 'react';
import { LoginForm } from './components/auth/LoginForm'; // Import the new form component

const LoginPage: React.FC = () => {
  const features = [
    { icon: 'fa-clock', title: 'Notícias em Tempo Real', description: 'Cobertura de eventos das últimas 48 horas com fontes da web.' },
    { icon: 'fa-wand-magic-sparkles', title: 'Análises Preditivas', description: 'Explore tendências e cenários futuros com análises baseadas em dados.' },
    { icon: 'fa-feather-alt', title: 'Conteúdo Otimizado', description: 'Artigos imparciais e bem estruturados, prontos para publicação.' },
  ];

  return (
    <div className="min-h-screen w-full bg-black font-mono text-gray-300">
      <div className="grid lg:grid-cols-2 min-h-screen">
         {/* Coluna Esquerda/Topo: Landing Info */}
         <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 lg:border-r lg:border-green-900/30">
          <div className="max-w-md mx-auto lg:mx-0 animate-fade-in-up">
            <div className="text-4xl font-bold tracking-widest mb-6 text-center lg:text-left">
              <span className="text-gray-200">GDN</span>
              <span className="text-green-400">_IA</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tighter mb-4 text-gray-100">
                O Futuro das Notícias,
                <span className="text-green-400"> Hoje.</span>
              </h1>
              <p className="text-lg text-gray-400 mb-8">
                Gere artigos sobre eventos recentes ou explore cenários futuros com nossa inteligência artificial avançada.
              </p>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="mt-1"><i className={`fas ${feature.icon} text-xl text-green-400`}></i></div>
                    <div>
                      <h3 className="font-bold text-gray-200">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita/Baixo: Formulário de Login */}
        <div className="flex items-center justify-center p-4">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;