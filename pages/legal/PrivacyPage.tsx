import React from 'react';
import { LegalLayout } from '../../components/legal/LegalLayout';

interface PrivacyPageProps {
  onBack: () => void;
}

export default function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <LegalLayout title="Política de Privacidade" onBack={onBack}>
      <h2 className="text-2xl font-bold text-white mb-4">Política de Privacidade</h2>
      <p className="text-sm text-gray-500 mb-6">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">1. Coleta de Dados</h3>
      <p className="mb-4 text-gray-300">
        O GDN_IA coleta informações mínimas necessárias para o funcionamento do serviço:
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-2">
        <li><strong>Informações de Conta:</strong> E-mail e Nome Completo (para login e personalização).</li>
        <li><strong>Dados de Uso:</strong> Histórico de gerações, prompts inseridos e feedbacks (para melhoria contínua da IA).</li>
        <li><strong>Dados Técnicos:</strong> Endereço IP e tipo de navegador (para segurança e prevenção de fraudes).</li>
      </ul>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">2. Uso das Informações</h3>
      <p className="mb-4 text-gray-300">
        Utilizamos seus dados para:
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-2">
        <li>Fornecer e manter o serviço GDN_IA.</li>
        <li>Processar pagamentos e gerenciar créditos.</li>
        <li>Melhorar nossos algoritmos de IA com base no feedback.</li>
        <li>Enviar comunicações importantes sobre sua conta ou atualizações do sistema.</li>
      </ul>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">3. Compartilhamento de Dados</h3>
      <p className="mb-4 text-gray-300">
        Não vendemos seus dados pessoais. Compartilhamos informações apenas com provedores de serviço essenciais para a operação (ex: processadores de pagamento como Mercado Pago/Stripe e provedores de nuvem como Supabase/Google Cloud), sob estritos acordos de confidencialidade.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">4. Publicidade e Cookies (Google AdSense)</h3>
      <p className="mb-4 text-gray-300">
        Podemos utilizar cookies e tecnologias de rastreamento de terceiros, incluindo o Google AdSense, para exibir anúncios relevantes. O Google utiliza o cookie DoubleClick DART para exibir anúncios com base nas suas visitas a este e a outros sites na internet. Você pode optar por não utilizar o cookie DART visitando a Política de privacidade da rede de conteúdo e anúncios do Google.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">5. Seus Direitos (LGPD)</h3>
      <p className="mb-4 text-gray-300">
        Você tem o direito de solicitar o acesso, correção ou exclusão dos seus dados pessoais a qualquer momento através do nosso suporte ou diretamente no painel de controle do usuário.
      </p>
    </LegalLayout>
  );
}