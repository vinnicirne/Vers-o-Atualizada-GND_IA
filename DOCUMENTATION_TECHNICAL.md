
# 🏗️ Documentação Técnica do Sistema - GDN_IA

## 1. Visão Geral

### Nome do Sistema
**GDN_IA** (Gerador de Notícias Inteligente & Creator Suite)

### Objetivo Principal
O GDN_IA é uma plataforma SaaS (Software as a Service) focada em **Inteligência Artificial Generativa**. O sistema permite que usuários criem diversos tipos de conteúdo — notícias baseadas em fatos reais, imagens artísticas, landing pages (código HTML/CSS), sites institucionais, copys de marketing e áudio — utilizando um sistema de créditos e planos de assinatura.

### Tecnologias Utilizadas
*   **Frontend:** React 18, Vite, TypeScript.
*   **Estilização:** Tailwind CSS, FontAwesome.
*   **Backend / BaaS:** Supabase (PostgreSQL, Auth, Realtime).
*   **Inteligência Artificial:**
    *   Google Gemini API (`gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`) para texto e áudio.
    *   Pollinations.ai para geração de imagens.
*   **Editor Visual:** GrapesJS (para Landing Pages e Sites).
*   **Visualização de Dados:** Recharts (Gráficos administrativos).

### Estrutura Geral de Pastas
A estrutura do projeto segue um padrão modular focado em funcionalidades e contextos:

```bash
/
├── components/         # Componentes React reutilizáveis
│   ├── admin/          # Componentes exclusivos do Painel Administrativo (UserTable, SecurityManager, etc)
│   ├── auth/           # Formulários de Login/Registro
│   └── ...             # Componentes gerais (Header, Loader, AffiliateModal, etc.)
├── contexts/           # Context API (UserContext)
├── hooks/              # Custom Hooks (usePlan, useMetrics, usePlans)
├── pages/              # Páginas principais (Dashboard, Admin, Login)
├── services/           # Camada de comunicação com APIs e Lógica de Negócio
│   ├── api.ts          # Wrapper genérico para o Supabase client
│   ├── adminService.ts # Lógica administrativa e de Afiliados
│   ├── paymentService.ts # Processamento de pagamentos e comissões
│   ├── geminiService.ts# Integração com Google GenAI (Core)
│   ├── loggerService.ts# Sistema centralizado de logs (Fire-and-Forget)
│   └── ...
├── types/              # Definições de Tipos TypeScript (Interfaces)
└── ...                 # Arquivos de configuração (vite, tailwind, tsconfig)
```

---

## 2. Autenticação e Segurança

### Fluxo de Autenticação
O sistema utiliza o **Supabase Auth** para gerenciamento de sessões.
1.  **Login/Registro:** Gerenciado pelo componente `LoginForm.tsx`.
2.  **Sessão:** O estado do usuário é persistido e monitorado via `UserContext.tsx`.

### Arquitetura de Segurança (Domínios)
Implementada em `services/adminService.ts` e `SecurityManager.tsx`. O sistema possui um validador híbrido no cadastro:
1.  **Blacklist Interna:** Bloqueia imediatamente domínios temporários ou de teste (`teste.com`, `tempmail.com`, etc).
2.  **Allowlist (Banco de Dados):** Verifica a tabela `allowed_domains`. Se o domínio estiver lá, o cadastro é aprovado imediatamente (VIP).
3.  **Validação Dinâmica (Configurável):**
    *   *Modo Estrito:* Apenas domínios na Allowlist passam.
    *   *Modo DNS:* Realiza uma consulta **DNS-over-HTTPS** (Google Public DNS) para verificar registros MX do domínio. Se o domínio existe e recebe emails, o cadastro é liberado.

---

## 3. Banco de Dados

O banco de dados é um PostgreSQL hospedado no Supabase.

### Principais Tabelas
1.  **`app_users`**: Perfis públicos dos usuários (espelho do auth). Contém `role`, `status`, `plan`, `last_login`, `affiliate_code`, `referred_by` e `affiliate_balance`.
2.  **`user_credits`**: Saldo de créditos de cada usuário.
3.  **`news`**: Conteúdo gerado (histórico). Armazena título, conteúdo, tipo (ferramenta usada), autor e fontes.
4.  **`transactions`**: Histórico financeiro (compras de planos ou créditos avulsos).
5.  **`affiliate_logs`**: (Novo) Histórico de comissões pagas aos afiliados. Contém `affiliate_id`, `source_user_id`, `amount` e `description`.
6.  **`logs`**: Auditoria do sistema.
7.  **`system_config`**: Armazenamento Key-Value JSON para configurações dinâmicas (Planos, Configs de IA, Gateways, Security Settings).
8.  **`user_memory`**: Sistema RAG para armazenar preferências e feedback do usuário.
9.  **`allowed_domains`**: Tabela para Whitelist de domínios corporativos ou permitidos.

### Relações Chave
*   `app_users.id` 1:1 `user_credits.user_id`
*   `app_users.id` 1:N `news.author_id`
*   `app_users.id` (Referrer) 1:N `app_users.referred_by` (Indicados)

---

## 4. Sistema de Afiliados

O sistema permite que usuários indiquem outros e ganhem comissão.

### Fluxo de Captura
1.  O afiliado compartilha o link: `url/?ref=CODIGO`.
2.  O `LoginForm.tsx` detecta o parâmetro `ref`.
3.  O código é salvo no `localStorage` ('gdn_referral') para persistir caso o usuário navegue antes de cadastrar.
4.  No momento do `signUp`, o código é verificado e, se válido, o `id` do afiliado é salvo na coluna `referred_by` do novo usuário.

### Comissionamento
1.  Quando uma compra é aprovada em `paymentService.ts`.
2.  A função `processAffiliateCommission` (em `adminService.ts`) é chamada.
3.  Ela verifica se o comprador tem um `referred_by` (pai).
4.  Calcula **20%** do valor da venda.
5.  Adiciona ao `affiliate_balance` do afiliado (pai) e cria um registro em `affiliate_logs`.

---

## 5. Serviços e APIs

### `services/loggerService.ts` (Novo)
Um serviço Singleton para centralizar logs.
*   **Padrão Fire-and-Forget:** As chamadas de log não usam `await` para não bloquear a interface do usuário.

### `services/api.ts`
Wrapper leve sobre o `supabase-js`. Padroniza respostas e captura erros de banco de dados.

### `services/geminiService.ts`
Controla a interação com o Google Gemini.
*   **Memória:** Injeta o histórico de feedback do usuário (`user_memory`) no *System Prompt* para aprendizado contínuo.
*   **Grounding:** Extrai fontes (URLs) quando o Google Search é utilizado.
*   **Prompt Engineering:** Possui prompts especializados para Site Institucional, Landing Pages (Tailwind) e Imagens.

---

## 6. Painel Administrativo

O acesso é protegido pelo componente `<AdminGate>`, que verifica a role do usuário (`admin` ou `super_admin`).

### Módulos
1.  **Dashboard:** Métricas gerais (Recharts).
2.  **Usuários:** Gestão completa (CRUD), banimento, ajuste de créditos e visualização de último login.
    *   *Delete:* Implementa exclusão em cascata manual (remove logs, histórico e créditos antes do usuário).
3.  **Histórico (News):** Visualização de todo conteúdo gerado (filtrado por tipo).
4.  **Planos:** Editor visual para criar/editar planos e permissões de serviço (JSON em `system_config`).
5.  **Segurança:** Gestão de Allowlist e modo de validação (Estrito vs DNS).
6.  **Sistema Multi-IA:** Configuração de chaves de API (Gemini/OpenAI/Claude).
7.  **Pagamentos:** Configuração de Gateways (Stripe, Mercado Pago, Asaas) e pacotes de créditos.

---

*Documentação técnica atualizada para o sistema GDN_IA v1.0.6.*
