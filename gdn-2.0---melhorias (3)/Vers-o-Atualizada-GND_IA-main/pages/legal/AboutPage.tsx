import React from 'react';
import { LegalLayout } from '../../components/legal/LegalLayout';

interface AboutPageProps {
  onBack: () => void;
}

export default function AboutPage({ onBack }: AboutPageProps) {
  return (
    <LegalLayout title="Quem Somos" onBack={onBack}>
      <h2 className="text-3xl font-bold text-white mb-6">Sobre o GDN_IA</h2>
      
      <p className="text-lg text-gray-300 mb-8 leading-relaxed">
        O <strong>GDN_IA (Gerador de Notícias Inteligente & Creator Suite)</strong> é uma plataforma SaaS pioneira que democratiza o acesso à Inteligência Artificial Generativa de ponta. Nascemos da necessidade de agilizar a produção de conteúdo digital com qualidade profissional, unindo tecnologia avançada e simplicidade de uso.
      </p>

      <div className="grid md:grid-cols-3 gap-8 my-12">
        <div className="bg-gray-800/50 p-6 rounded-xl border border-green-900/30 hover:border-green-500/50 transition">
            <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mb-4 text-green-400 text-2xl">
                <i className="fas fa-rocket"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nossa Missão</h3>
            <p className="text-sm text-gray-400">
                Empoderar criadores, jornalistas e empreendedores com ferramentas de IA que eliminam o bloqueio criativo e multiplicam a produtividade em 10x.
            </p>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-xl border border-green-900/30 hover:border-green-500/50 transition">
            <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mb-4 text-green-400 text-2xl">
                <i className="fas fa-eye"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nossa Visão</h3>
            <p className="text-sm text-gray-400">
                Ser a plataforma de referência em geração de conteúdo multimídia (Texto, Imagem, Web) na América Latina, liderando a inovação ética em IA.
            </p>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-xl border border-green-900/30 hover:border-green-500/50 transition">
            <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mb-4 text-green-400 text-2xl">
                <i className="fas fa-gem"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nossos Valores</h3>
            <ul className="text-sm text-gray-400 space-y-1 list-disc pl-4">
                <li>Inovação Contínua</li>
                <li>Transparência Algorítmica</li>
                <li>Foco no Usuário</li>
                <li>Excelência Técnica</li>
            </ul>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-4">Nossa Tecnologia</h3>
      <p className="text-gray-400 mb-4">
        Utilizamos uma orquestração avançada de Modelos de Linguagem (LLMs) de última geração, incluindo Google Gemini e Stable Diffusion, para garantir resultados precisos, criativos e contextualizados.
      </p>
    </LegalLayout>
  );
}