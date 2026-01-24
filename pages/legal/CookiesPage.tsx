import React from 'react';
import { LegalLayout } from '../../components/legal/LegalLayout';

interface CookiesPageProps {
  onBack: () => void;
}

export default function CookiesPage({ onBack }: CookiesPageProps) {
  return (
    <LegalLayout title="Política de Cookies" onBack={onBack}>
      <h2 className="text-2xl font-bold text-white mb-4">Política de Cookies</h2>
      
      <p className="mb-4 text-gray-300">
        O GDN_IA utiliza cookies para melhorar sua experiência, garantir a segurança e analisar o tráfego do site.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">1. O que são Cookies?</h3>
      <p className="mb-4 text-gray-300">
        Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. Eles permitem que o site "lembre" de suas ações e preferências ao longo do tempo.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">2. Como utilizamos os Cookies</h3>
      <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-2">
        <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento do site (ex: manter você logado, segurança do Supabase Auth).</li>
        <li><strong>Cookies de Preferências:</strong> Lembram suas configurações (ex: tema, idioma, últimos prompts).</li>
        <li><strong>Cookies de Análise:</strong> Ajudam a entender como os usuários interagem com o site.</li>
        <li><strong>Cookies de Publicidade:</strong> Usados por parceiros (como Google AdSense) para exibir anúncios relevantes baseados em seus interesses.</li>
      </ul>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">3. Gerenciamento de Cookies</h3>
      <p className="mb-4 text-gray-300">
        Você pode controlar e/ou excluir cookies como desejar através das configurações do seu navegador. Note que desativar cookies essenciais pode afetar o funcionamento do login e das ferramentas de geração.
      </p>
    </LegalLayout>
  );
}