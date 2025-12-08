
# 🏗️ Documentação Técnica do Sistema - GDN_IA

## 1. Visão Geral

### Nome do Sistema
**GDN_IA** (Gerador de Notícias Inteligente & Creator Suite)

### Objetivo Principal
O GDN_IA é uma plataforma SaaS (Software as a Service) focada em **Inteligência Artificial Generativa**. O sistema permite que usuários criem diversos tipos de conteúdo — notícias, imagens, sites, copys e áudio — utilizando um sistema híbrido de acesso (Visitante/Logado) e um funil de vendas integrado.

### Tecnologias Utilizadas
*   **Frontend:** React 18, Vite, TypeScript.
*   **Estilização:** Tailwind CSS, FontAwesome.
*   **Backend / BaaS:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions).
*   **Inteligência Artificial:**
    *   Google Gemini API (`gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`) para texto e áudio.
    *   Pollinations.ai para geração de imagens.
*   **E-mail Transacional:** Resend (via Edge Functions).
*   **Editor Visual:** GrapesJS (para Landing Pages e Sites).

---

## 2. Arquitetura de Funcionalidades

### Modo Visitante (Guest Mode)
Implementado no frontend para permitir degustação do produto.
*   **Estado:** Utiliza `localStorage.getItem('gdn_guest_credits')`.
*   **Inicialização:** Se a chave não existir, inicia com 3 créditos.
*   **Restrições:** O componente `ContentGenerator.tsx` bloqueia ferramentas avançadas se `!user`.

### Motor de SEO (`services/seoService.ts`)
Sistema para garantir pontuação alta em ferramentas como Yoast/Rank Math.
*   **Golden Keyword:** Algoritmo que encontra interseções de palavras entre título e introdução.
*   **Metadados:** Gera Title e Meta Description dentro dos limites de caracteres.

### Landing Page Isolada
A página de vendas é desacoplada do painel administrativo.
*   **Rota:** Acessível via `/?page=landing`.
*   **Lógica:** O `App.tsx` verifica este parâmetro antes de verificar a autenticação, permitindo que a Landing Page seja renderizada mesmo se o usuário tiver sessão (ou não).

---

## 3. Funil de Vendas e CRM (Novo)

O sistema possui um CRM nativo para gerenciar leads capturados na Landing Page.

### Estrutura de Dados (Supabase)
1.  **`leads`**: Armazena os contatos.
    *   Campos: `id`, `email`, `nome`, `whatsapp`, `status_funil` (new, contacted, qualified, converted, lost), `score`, `tags`, `utm_source`, `utm_medium`, `utm_campaign`, `created_at`.
    *   **Segurança (RLS):** Permite `INSERT` público (anônimo) para captura de leads via formulário. `SELECT/UPDATE/DELETE` restrito a Admins.
2.  **`eventos_marketing`**: Rastreia a jornada do lead.
    *   Tipos: `view_landing`, `submit_form`, `email_open`.
3.  **`deals`**: Registra vendas associadas a um lead.

### Automação de Isca Digital (Lead Magnet)
Fluxo automático ao capturar um lead:
1.  **Frontend (`LandingPage.tsx`):**
    *   Captura parâmetros UTM da URL e salva em `sessionStorage`.
    *   Envia dados do formulário para a tabela `leads`.
    *   Invoca a Edge Function `deliver-lead-magnet`.
2.  **Edge Function (`supabase/functions/deliver-lead-magnet`):**
    *   Recebe o e-mail e nome do lead.
    *   Gera o corpo do e-mail (HTML com o E-book/Guia).
    *   Envia via API da **Resend**.

---

## 4. Integração de E-mail (Resend)

Para ativar o envio de e-mails, siga estes passos:

### Configuração
1.  **Conta:** Crie uma conta em [resend.com](https://resend.com).
2.  **API Key:** Gere uma chave com permissão de envio ("Sending Access").
3.  **Supabase:**
    *   Acesse o Dashboard do Supabase.
    *   Vá em **Settings** > **Edge Functions**.
    *   Adicione uma Secret: `RESEND_API_KEY` = `sua_chave_re_123...`.
4.  **Verificação de Domínio (Produção):**
    *   Para enviar e-mails para endereços reais (não apenas o seu de teste), adicione seu domínio no painel da Resend e configure os registros DNS (DKIM/SPF) no seu provedor de domínio.
    *   Atualize o campo `from` no arquivo `supabase/functions/deliver-lead-magnet/index.ts` para um e-mail do seu domínio (ex: `contato@seusite.com`).

---

## 5. Autenticação e Segurança

### Fluxo de Autenticação
*   **Supabase Auth:** Gerencia sessões JWT.
*   **Persistência:** `UserContext.tsx` sincroniza o estado global.

### Segurança de Domínios
*   **Blacklist Interna:** Bloqueia domínios temporários (`tempmail.com`, etc).
*   **Allowlist/DNS:** Configurável via Admin para restringir cadastros a domínios corporativos específicos.

---

## 6. Banco de Dados e Afiliados

### Tabelas Principais
*   **`app_users`**: Perfil público.
*   **`user_credits`**: Saldo.
*   **`news`**: Histórico de conteúdo.
*   **`transactions`**: Histórico financeiro.
*   **`affiliate_logs`**: Registro de comissões.
*   **`system_config`**: Armazena JSONs de configuração (White Label, IA, Planos).

### Sistema de Afiliados
1.  **Tracking:** Parâmetro URL `?ref=CODE` salvo no `localStorage`.
2.  **Vínculo:** No cadastro, o código é lido e o ID do afiliado é salvo em `referred_by`.
3.  **Comissão:** Edge Functions (`mp-pagar`, `asaas-pagar`) calculam e registram comissão (20%) após confirmação de pagamento.

---

## 7. Integrações (Webhooks / N8N)

O sistema permite enviar dados gerados para workflows externos.

### Payload JSON (Enviado para o Webhook)
```json
{
  "title": "Título do Conteúdo",
  "content": "Conteúdo completo (Texto ou HTML)",
  "mode": "tipo_de_geracao (ex: news_generator)",
  "generated_at": "ISO 8601 Timestamp",
  "audio_base64": "String Base64 (se houver áudio)",
  "image_prompt": "Prompt usado (se for imagem)",
  "source": "gdn_ia_dashboard",
  "userId": "uuid-do-usuario"
}
```

---

*Documentação técnica atualizada para o sistema GDN_IA v1.0.9 - Com CRM e Automação de Marketing.*
