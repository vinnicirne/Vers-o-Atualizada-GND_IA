
<div align="center">
  <img src="https://cdn-icons-png.flaticon.com/512/16806/16806607.png" width="100" alt="Logo" />
  <h1>GDN_IA - Creator Suite & CRM</h1>
  <p><strong>Plataforma SaaS de Inteligência Artificial Generativa com Funil de Vendas Integrado.</strong></p>
</div>

---

## 🚀 Visão Geral

O **GDN_IA** é uma solução completa que combina ferramentas de criação de conteúdo baseadas em IA (Gemini & Stable Diffusion) com um sistema de gestão de leads (CRM) e personalização de marca (White Label).

### Principais Módulos:
1.  **Creator Suite:** Gerador de Notícias, Imagens, Sites, Áudio (TTS), Social Media e Currículos.
2.  **CRM & Funil de Vendas:** Captura de leads via Landing Page, automação de e-mail (Isca Digital) e gestão de pipeline (Kanban/Lista).
3.  **White Label:** Personalização completa de cores, logos e textos via painel administrativo.
4.  **Admin Panel:** Gestão de usuários, planos, pagamentos (Stripe/MercadoPago/Asaas), logs e segurança.

---

## 🛠️ Stack Tecnológica

*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS.
*   **Backend (BaaS):** Supabase (PostgreSQL, Auth, Realtime, Storage).
*   **Serverless:** Supabase Edge Functions (Deno/TypeScript).
*   **IA Models:** Google Gemini 2.5 Flash, Pollinations.ai.
*   **Integrações:** N8N (Webhooks), WordPress API, Resend (E-mail).

---

## ⚙️ Instalação e Configuração

### 1. Pré-requisitos
*   Node.js 18+ instalado.
*   Conta no [Supabase](https://supabase.com).
*   Chave de API do [Google AI Studio](https://aistudio.google.com/).

### 2. Instalação
Clone o repositório e instale as dependências:

```bash
git clone https://github.com/seu-usuario/gdn-ia.git
cd gdn-ia
npm install
```

### 3. Variáveis de Ambiente (.env.local)
Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Google Gemini AI (Client-Side Fallback & Server-Side)
GEMINI_API_KEY=sua-chave-gemini-aqui
```

### 4. Configuração do Banco de Dados (Supabase)
1.  Acesse o painel do Supabase.
2.  Vá em **SQL Editor**.
3.  Copie o conteúdo de `DOCUMENTATION_TECHNICAL.md` (Seção Banco de Dados) ou use os scripts na aba "Updates & SQL" do painel Admin do sistema rodando.
4.  Execute para criar as tabelas (`app_users`, `leads`, `system_config`, etc.).

### 5. Edge Functions (Opcional - Para Pagamentos e E-mails)
Para funcionalidades avançadas (Checkout Asaas/MP, Envio de E-book), configure as secrets no Supabase:

```bash
# Exemplo via CLI ou Painel Web
supabase secrets set RESEND_API_KEY=re_123...
supabase secrets set MP_ACCESS_TOKEN=APP_USR...
supabase secrets set ASAAS_KEY=...
```

### 6. Executar
```bash
npm run dev
```
O sistema estará rodando em `http://localhost:3000`.

---

## 📚 Documentação Adicional

*   **[Manual do Usuário](MANUAL_DO_USUARIO.md):** Guia funcional das ferramentas e painel admin.
*   **[Documentação Técnica](DOCUMENTATION_TECHNICAL.md):** Detalhes da arquitetura, esquema do banco de dados e APIs.

---

## 🧹 Manutenção

Para remover arquivos não utilizados e manter o projeto limpo:
```bash
npm run cleanup
```
