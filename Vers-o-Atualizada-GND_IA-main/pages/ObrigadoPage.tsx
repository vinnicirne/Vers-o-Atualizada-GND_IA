
import React, { useEffect } from 'react';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { trackEvent } from '../services/trackingService';

export default function ObrigadoPage() {
  const { settings } = useWhiteLabel();

  useEffect(() => {
    // Dispara evento de conversão ao carregar a página
    trackEvent('purchase', undefined, { type: 'lead_magnet_conversion' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex flex-col">
      <nav className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-center">
            <span className="text-2xl font-bold tracking-tight text-gray-900">
                <span style={{ color: settings.secondaryColorHex }}>{settings.logoTextPart1}</span>
                <span style={{ color: settings.primaryColorHex }}>{settings.logoTextPart2}</span>
            </span>
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-16 flex flex-col items-center text-center">
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
            <i className="fas fa-check text-4xl text-green-600"></i>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Sucesso! Material Enviado.</h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mb-12 leading-relaxed">
            O seu <strong>Guia de Engenharia de Prompts</strong> já está a caminho da sua caixa de entrada.
            <br/>
            Enquanto isso, que tal colocar o que você vai aprender em prática?
        </p>

        {/* Upsell Card */}
        <div className="bg-white max-w-4xl w-full rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-gray-900 p-8 text-white flex flex-col justify-center text-left">
                <h3 className="text-2xl font-bold mb-4 text-[var(--brand-primary)]" style={{ color: settings.primaryColorHex }}>Conta Gratuita GDN_IA</h3>
                <p className="text-gray-300 mb-6">
                    Acesse a ferramenta mais completa de IA para criadores. Gere notícias, imagens e sites em segundos.
                </p>
                <ul className="space-y-3 mb-8">
                    <li className="flex items-center"><i className="fas fa-check-circle text-green-400 mr-3"></i> 3 Créditos Grátis</li>
                    <li className="flex items-center"><i className="fas fa-check-circle text-green-400 mr-3"></i> Gerador de Imagens 8K</li>
                    <li className="flex items-center"><i className="fas fa-check-circle text-green-400 mr-3"></i> Criador de Sites</li>
                </ul>
                <a 
                    href="/?page=login" 
                    className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg text-center transition shadow-lg"
                    style={{ backgroundColor: settings.primaryColorHex }}
                >
                    Criar Minha Conta Agora
                </a>
            </div>
            <div className="md:w-1/2 p-8 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Próximos Passos</p>
                    <div className="space-y-6 text-left">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                            <div>
                                <p className="font-bold text-gray-800">Verifique seu E-mail</p>
                                <p className="text-xs text-gray-500">Procure por um e-mail de "GDN_IA". Olhe no Spam se necessário.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                            <div>
                                <p className="font-bold text-gray-800">Crie sua Conta</p>
                                <p className="text-xs text-gray-500">Use o botão ao lado para acessar o painel.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                            <div>
                                <p className="font-bold text-gray-800">Comece a Criar</p>
                                <p className="text-xs text-gray-500">Use os prompts do guia na nossa ferramenta.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <p className="mt-12 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {settings.appName}. Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
}
