
# 📘 Manual Oficial do Sistema GDN_IA

Bem-vindo à documentação completa do **GDN_IA (Gerador de Notícias Inteligente & Creator Suite)**. Este documento detalha todas as funcionalidades da plataforma, divididas entre o perfil de **Usuário** e o perfil de **Administrador**.

---

# 👤 Parte 1: Manual do Usuário

O GDN_IA é uma suíte criativa impulsionada por Inteligência Artificial (Gemini 2.5) projetada para gerar notícias, imagens, landing pages, sites institucionais, áudio e textos de marketing com alta qualidade.

## 1. Acesso e Conta
*   **Modo Visitante (Novo):** Você pode testar ferramentas básicas (Notícias, Copy, Prompts) gratuitamente sem precisar fazer login. O sistema concede **3 créditos temporários**.
*   **Login/Cadastro:** Para desbloquear ferramentas avançadas (Imagens, Sites, Áudio) e salvar seu histórico, crie uma conta gratuita.
*   **Logout:** Clique no ícone de "Sair" (porta com seta) no cabeçalho superior direito.

## 2. Dashboard (Painel Principal)
Ao acessar, você verá o Dashboard. Ele contém:
*   **Cabeçalho:** Mostra seu plano atual (ou "Visitante"), saldo de créditos e data do último acesso.
*   **Botão Histórico:** Um ícone de relógio para acessar suas gerações passadas (Apenas usuários logados).
*   **Botão Afiliados:** Um ícone de aperto de mão (🤝) para acessar seu link de indicação.
*   **Seletor de Ferramentas:** Uma grade com ícones representando cada módulo da IA. Ícones com cadeado indicam recursos exclusivos de planos superiores ou login necessário.

## 3. Ferramentas do Creator Suite

### 📰 GDN Notícias (News Generator)
Gera artigos jornalísticos baseados em fatos recentes com foco total em **SEO (Search Engine Optimization)**.
*   **SEO Automático (Score 100):** O sistema analisa o texto gerado, escolhe a melhor palavra-chave automaticamente e gera Título, Slug e Meta Descrição otimizados, prontos para copiar.
*   **Organização:** O resultado é separado em caixas distintas: Título, Conteúdo e Metadados, facilitando a cópia para seu CMS (WordPress/Blog).
*   **Busca:** A IA acessa o Google Search para buscar dados das últimas 48h.

### 🏢 Site Institucional
Cria sites corporativos completos em segundos.
*   **Estrutura:** Gera Home, Sobre Nós, Serviços e Contato em formato One-Page.
*   **Design:** Utiliza Tailwind CSS e imagens profissionais.

### 🎨 Studio de Arte IA (Image Generation)
Cria imagens artísticas ou realistas.
*   **Editor:** Após gerar, você pode aplicar filtros (Brilho, Contraste) e baixar a imagem.
*   **Prompt:** A IA traduz seu pedido para um prompt técnico em inglês antes de gerar.

### 🌐 Gerador de Landing Page
Cria páginas web completas (HTML + Tailwind CSS) focadas em conversão.
*   **Editor Visual:** Permite ver prévia em Mobile/Tablet e exportar o código HTML.

### Outras Ferramentas
*   **Editor Visual (Social Media):** Estruturas para posts de redes sociais.
*   **Texto para Voz:** Sintetizador de voz neural.
*   **Copy & Prompts:** Textos persuasivos e engenharia de prompt.

## 4. Programa de Afiliados
Ganhe 20% de comissão indicando novos usuários.
*   Acesse o ícone 🤝 no topo.
*   Copie seu link exclusivo (`?ref=...`).
*   Acompanhe extrato e saldo em tempo real.
*   **Popup de Convite:** O sistema convida proativamente usuários a se tornarem parceiros.

## 5. Histórico
Clique no ícone de Relógio no topo para ver "Meu Histórico".
*   Filtre por tipo (Notícias, Sites, Imagens, etc).
*   Releia ou copie conteúdos antigos.

---

# 🛡️ Parte 2: Manual do Administrador

O painel administrativo é o centro de controle do GDN_IA. Apenas usuários com role `admin` ou `super_admin` têm acesso.

## 1. Acesso ao Admin
*   No Dashboard, clique no botão "Admin" no cabeçalho.

## 2. Dashboard Administrativo
*   **Métricas:** Usuários totais, ativos, créditos em circulação e faturamento.
*   **Gráficos:** Uso da plataforma nos últimos 7 dias.

## 3. Gerenciamento de Usuários (`Usuários`)
*   **Tabela:** Veja quem está online (Último Login).
*   **Edição:** Altere Role, Status (Banir/Ativar) e Créditos.
*   **Exclusão:** O sistema remove automaticamente todos os dados vinculados (logs, notícias) antes de excluir o usuário.

## 4. Histórico Geral (`Histórico`)
*   Visualize tudo o que está sendo gerado na plataforma.
*   Filtre por status ou edite conteúdos impróprios.

## 5. Segurança (`Segurança`)
Controle quem pode se cadastrar no sistema.
*   **Modo de Validação:**
    *   **Lista Estrita:** Só aceita e-mails de domínios que você cadastrou manualmente na lista.
    *   **Validação Automática (DNS):** Aceita qualquer e-mail de domínio válido (que existe na internet), mas bloqueia domínios temporários/fake.
*   **Adição Rápida:** Use os botões de atalho para liberar Gmail, Outlook, UOL, etc.

## 6. Pagamentos (`Pagamentos`)
*   **Relatório:** Veja todas as transações.
*   **Configurações:**
    *   Configure chaves para **Stripe**, **Mercado Pago** e **Asaas**.
    *   Crie pacotes de créditos avulsos.

## 7. Planos (`Planos`)
Crie a hierarquia de assinaturas (Free, Basic, Premium).
*   Defina quais ferramentas cada plano acessa e quanto custa cada uso.

## 8. Sistema Multi-IA (`Sistema Multi-IA`)
*   Gerencie as chaves de API (Google Gemini, OpenAI, Claude).
*   Ative/Desative modelos específicos.

## 9. Logs (`Logs`)
Auditoria completa do sistema.
*   Filtre por módulo (Segurança, Usuários, Pagamentos) para investigar ações.

---

**GDN_IA v1.0.9** - Documentação atualizada com melhorias de afiliados, popup de convite e refatoração de código.
