
# 🏗️ Documentação Técnica - GDN_IA v1.5.5

## 1. Arquitetura do Sistema

O sistema utiliza uma arquitetura **Single Page Application (SPA)** moderna e serverless.

*   **Frontend:** React 18, Vite, TypeScript.
*   **UI Framework:** Tailwind CSS (Estilização), FontAwesome (Ícones).
*   **Gerenciamento de Estado:** React Context API (`UserContext`, `WhiteLabelContext`).
*   **Backend as a Service (BaaS):** Supabase.
    *   **Auth:** Gerenciamento de usuários e JWT.
    *   **Database:** PostgreSQL.
    *   **Realtime:** Websockets para atualizações ao vivo (Logs, Notificações).
    *   **Storage:** Armazenamento de assets (se necessário).
    *   **Edge Functions:** Lógica de backend segura (Pagamentos, E-mails, Proxy de IA).

---

## 2. Banco de Dados (Schema PostgreSQL)

Abaixo estão as principais tabelas e suas funções.

### `app_users` (Extensão da tabela auth.users)
Armazena dados públicos e configurações do usuário.
*   `id` (uuid, PK): Vínculo com `auth.users`.
*   `full_name`, `email`, `phone`: Dados cadastrais.
*   `role`: 'user', 'admin', 'super_admin'.
*   `credits`: Saldo de créditos (-1 = ilimitado).
*   `plan`: ID do plano atual (ex: 'basic', 'premium').
*   `affiliate_code`: Código único para indicar outros usuários.
*   `referred_by`: ID do usuário que indicou este perfil.

### `leads` (CRM Module)
Armazena potenciais clientes capturados na Landing Page.
*   `id` (uuid, PK).
*   `email`, `nome`, `telefone`, `empresa`.
*   `status_funil`: 'new', 'contacted', 'qualified', 'converted', 'lost'.
*   `utm_source`, `utm_medium`, `utm_campaign`: Rastreamento de origem.
*   `score`: Pontuação automática do lead.

### `system_config` (Key-Value Store)
Armazena configurações globais dinâmicas.
*   `key` (text, PK): Ex: 'white_label_settings', 'payment_settings'.
*   `value` (jsonb): O objeto de configuração.

### `transactions`
Histórico financeiro.
*   `id`, `usuario_id`, `valor`, `status`, `metodo`, `external_id` (ID do Gateway).

### `news`
Histórico de conteúdo gerado.
*   `id`, `author_id`, `titulo`, `conteudo` (HTML/Texto), `tipo` (ferramenta usada).

---

## 3. Edge Functions (Serverless)

Localizadas em `/supabase/functions`. Elas rodam no Deno e garantem segurança para operações sensíveis.

1.  **`generate-content`**:
    *   **Função:** Proxy para a API do Google Gemini.
    *   **Segurança:** Protege a `GEMINI_API_KEY` do cliente.
    *   **Lógica:** Recebe o prompt, injeta instruções de sistema (personas) e formata a resposta.

2.  **`deliver-lead-magnet`**:
    *   **Função:** Envia e-mails transacionais via Resend.
    *   **Gatilho:** Chamada pelo frontend quando um lead se cadastra na Landing Page.
    *   **Payload:** Envia o HTML do E-book ou Guia.

3.  **`mp-pagar` / `asaas-pagar`**:
    *   **Função:** Processamento de pagamentos e Webhooks.
    *   **Lógica:** Cria transações, valida assinaturas e libera créditos/planos automaticamente após confirmação do gateway.

4.  **`n8n-proxy`**:
    *   **Função:** Encaminha dados gerados para webhooks externos (N8N) de forma segura, evitando erros de CORS no navegador.

---

## 4. Segurança e RLS (Row Level Security)

Todas as tabelas possuem RLS habilitado.

*   **Leads:** `INSERT` liberado para `anon` (público) para permitir cadastro na Landing Page. `SELECT/UPDATE` restrito a `admins`.
*   **App Users:** Usuários só podem ler/editar seus próprios dados. Admins podem ver todos.
*   **System Config:** Apenas leitura para usuários (para carregar White Label). Apenas escrita para admins.

---

## 5. Estrutura de Pastas (Frontend)

*   `/components`: Componentes React reutilizáveis.
    *   `/admin`: Componentes do painel administrativo (CRMManager, Tables, Charts).
    *   `/dashboard`: Componentes da área logada.
    *   `/landing-page`: Blocos e templates do construtor de sites.
*   `/contexts`: Gerenciamento de estado global (`UserContext`, `WhiteLabelContext`).
*   `/hooks`: Hooks customizados (`usePlan`, `useDashboard`).
*   `/pages`: Rotas principais (Admin, Dashboard, Landing, Legal).
*   `/services`: Camada de comunicação com APIs (`api.ts`, `adminService.ts`, `geminiService.ts`).
*   `/types`: Definições de tipos TypeScript (`index.ts`, `plan.types.ts`).

---

## 6. Integrações

### Google Gemini (IA)
Utilizado para geração de texto, código HTML (sites), análise de dados e TTS (Text-to-Speech).

### Pollinations.ai (Imagens)
Utilizado para geração de imagens gratuita via URL paramétrica.

### Resend (E-mail)
Utilizado para envio de e-mails transacionais (Recuperação de senha, Iscas digitais).

### Gateways de Pagamento
O sistema suporta **Mercado Pago** e **Asaas** nativamente via Edge Functions, com suporte a Pix e Cartão de Crédito (incluindo recorrência).
