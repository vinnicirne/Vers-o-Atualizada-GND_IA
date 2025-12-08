import React from 'react';
import { LegalLayout } from '../../components/legal/LegalLayout';

interface TermsPageProps {
  onBack: () => void;
}

export default function TermsPage({ onBack }: TermsPageProps) {
  return (
    <LegalLayout title="Termos de Uso" onBack={onBack}>
      <h2 className="text-2xl font-bold text-white mb-4">Termos e Condições de Uso</h2>
      
      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">1. Aceitação dos Termos</h3>
      <p className="mb-4 text-gray-300">
        Ao acessar e utilizar o GDN_IA, você concorda integralmente com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nosso serviço.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">2. Uso do Serviço</h3>
      <p className="mb-4 text-gray-300">
        O GDN_IA concede a você uma licença limitada, não exclusiva e revogável para utilizar nossas ferramentas de IA para fins pessoais ou comerciais, sujeito às seguintes restrições:
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-2">
        <li>Você não deve usar a plataforma para gerar conteúdo ilegal, discriminatório, ofensivo ou que viole direitos autorais.</li>
        <li>Você é responsável por todo o conteúdo gerado através da sua conta.</li>
        <li>É proibido tentar realizar engenharia reversa ou sobrecarregar nossos servidores (DDoS).</li>
      </ul>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">3. Sistema de Créditos e Pagamentos</h3>
      <p className="mb-4 text-gray-300">
        O serviço opera em um modelo freemium baseado em créditos. A compra de créditos ou assinatura de planos é final e, via de regra, não reembolsável, exceto conforme exigido por lei ou falha técnica comprovada do sistema.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">4. Propriedade Intelectual</h3>
      <p className="mb-4 text-gray-300">
        O conteúdo gerado pela IA é disponibilizado a você para uso livre. No entanto, a estrutura do software, código-fonte, design e marca GDN_IA são propriedade exclusiva da nossa empresa.
      </p>

      <h3 className="text-xl font-bold text-green-400 mt-8 mb-3">5. Limitação de Responsabilidade</h3>
      <p className="mb-4 text-gray-300">
        O GDN_IA utiliza inteligência artificial, que pode ocasionalmente gerar informações imprecisas ("alucinações"). Não nos responsabilizamos por decisões tomadas com base no conteúdo gerado pela plataforma. Recomendamos sempre a revisão humana antes da publicação.
      </p>
    </LegalLayout>
  );
}