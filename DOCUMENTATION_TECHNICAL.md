# 🏗️ Documentação Técnica do Sistema - GDN_IA

## 1. Visão Geral

### Nome do Sistema
**GDN_IA** (Gerador de Notícias Inteligente & Creator Suite)

### Objetivo Principal
O GDN_IA é uma plataforma SaaS (Software as a Service) focada em **Inteligência Artificial Generativa**. O sistema permite que usuários criem diversos tipos de conteúdo — notícias baseadas em fatos reais, imagens artísticas, landing pages (código HTML/CSS), copys de marketing e áudio — utilizando um sistema de créditos e planos de assinatura.

### Tecnologias Utilizadas
*   **Frontend:** React 18, Vite, TypeScript.
*   **Estilização:** Tailwind CSS, FontAwesome.
*   **Backend / BaaS:** Supabase (PostgreSQL, Auth, Realtime).
*   **Inteligência Artificial:**
    *   Google Gemini API (`gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`) para texto e áudio.
    *   Pollinations.ai para geração de imagens.
*   **Editor Visual:** GrapesJS (para Landing Pages).
*   **Visualização de Dados:** Recharts (Gráficos administrativos).

### Estrutura Geral de Pastas
A estrutura do projeto segue um padrão modular focado em funcionalidades e contextos:

```bash
/
├── components/         # Componentes React reutilizáveis
│   ├── admin/          # Componentes exclusivos do Painel Administrativo
│   ├── auth/           # Formulários de Login/Registro
│   └── ...             # Componentes gerais (Header, Loader, etc.)
├── contexts/           # Context API (UserContext)
├── hooks/              # Custom Hooks (usePlan, useMetrics, useTokenUsage)
├── pages/              # Páginas principais (Dashboard, Admin, Login)
├── services/           # Camada de comunicação com APIs
│   ├── api.ts          # Wrapper genérico para o Supabase client
│   ├── adminService.ts # Lógica de negócio do admin
│   ├── geminiService.ts# Integração com Google GenAI
│   └── ...
├── types/              # Definições de Tipos TypeScript (Interfaces)
└── ...                 # Arquivos de configuração (vite, tailwind, tsconfig)
```

---

## 2. Autenticação e Usuários

### Fluxo de Autenticação
O sistema utiliza o **Supabase Auth** para gerenciamento de sessões.
1.  **Login/Registro:** Gerenciado pelo componente `LoginForm.tsx`.
2.  **Sessão:** O estado do usuário é persistido e monitorado via `UserContext.tsx`.

### Estrutura do Usuário (`app_users`)
Diferente da tabela padrão `auth.users` do Supabase (que é interna e protegida), o sistema espelha os dados públicos dos usuários na tabela `public.app_users`.

**Campos da tabela `public.app_users`:**
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid | Chave primária (FK para auth.users) |
| `email` | text | Email do usuário |
| `full_name`| text | Nome completo |
| `role` | text | Papel no sistema (`user`, `editor`, `admin`, `super_admin`) |
| `status` | text | Estado da conta (`active`, `inactive`, `banned`) |
| `plan` | text | ID do plano atual (ex: `free`, `premium`) |
| `created_at`| timestamp| Data de criação |

### Gerenciamento de Créditos (`user_credits`)
Os créditos são desacoplados do perfil do usuário para facilitar transações e atualizações atômicas.
*   **Tabela:** `public.user_credits`
*   **Campos:** `user_id` (FK), `credits` (int).
*   **Nota:** O valor `-1` no campo `credits` representa créditos **ilimitados** (usado para Admins).

---

## 3. Banco de Dados

O banco de dados é um PostgreSQL hospedado no Supabase.

### Principais Tabelas
1.  **`app_users`**: Perfis públicos dos usuários.
2.  **`user_credits`**: Saldo de créditos de cada usuário.
3.  **`news`**: Conteúdo gerado (notícias). Armazena título, conteúdo, autor e fontes.
4.  **`transactions`**: Histórico financeiro (compras de planos ou créditos avulsos).
5.  **`logs`**: Auditoria do sistema. Registra ações importantes (ex: `update_user`, `generated_content`).
6.  **`system_config`**: Armazenamento Key-Value para configurações dinâmicas (Planos, Configs de IA, Gateways de Pagamento).
7.  **`user_memory`**: Sistema RAG (Retrieval-Augmented Generation) para armazenar preferências e feedback do usuário.

### Relações Chave
*   `app_users.id` 1:1 `user_credits.user_id`
*   `app_users.id` 1:N `news.author_id`
*   `app_users.id` 1:N `transactions.usuario_id`
*   `app_users.id` 1:N `logs.usuario_id`

---

## 4. Serviços e APIs

A camada de serviços abstrai a complexidade das chamadas externas.

### `services/api.ts`
Um wrapper leve sobre o `supabase-js`. Padroniza as respostas e tratamento de erros para operações CRUD (`select`, `insert`, `update`, `delete`). Evita repetição de código try/catch nos componentes.

### `services/geminiService.ts`
Controla a interação com o Google Gemini.
*   **Função Principal:** `generateCreativeContent`.
*   **Lógica:** Constrói prompts dinâmicos baseados no modo escolhido (News, Image Prompt, Code Generation).
*   **Memória:** Consulta `user_memory` antes de gerar conteúdo para personalizar a resposta baseada em feedbacks anteriores.

### `services/adminService.ts`
Centraliza operações privilegiadas.
*   Busca paginada de usuários, logs e transações.
*   Atualização de configurações do sistema (`system_config`).
*   Edição de usuários e aprovação de notícias.

---

## 5. Painel Administrativo

O acesso é protegido pelo componente `<AdminGate>`, que verifica a role do usuário (`admin` ou `super_admin`).

### Funcionalidades
1.  **Dashboard:** Métricas gerais (Recharts) mostrando novos usuários vs. notícias geradas.
2.  **Usuários:** Tabela com busca e edição de permissões/créditos.
3.  **Notícias:** Fluxo de moderação (Pendente -> Aprovado/Rejeitado).
4.  **Planos:** Editor visual para criar/editar planos JSON armazenados em `system_config`. Permite definir quais serviços cada plano acessa.
5.  **Sistema Multi-IA:** Interface para inserir chaves de API e ativar/desativar modelos (Gemini/OpenAI/Claude) dinamicamente sem redeploy.
6.  **Logs:** Visualizador de auditoria com filtros por módulo e ação.

---

## 6. Integração com IA

O sistema utiliza uma arquitetura agnóstica a modelos, configurável via banco de dados (`system_config`), mas implementada primariamente com Gemini.

### Modelos Suportados (Implementação Atual)
*   **Texto/Código/Raciocínio:** `gemini-2.5-flash`
*   **Audio (TTS):** `gemini-2.5-flash-preview-tts`
*   **Imagens:** O sistema usa o Gemini para gerar um *prompt* otimizado em inglês, que é então enviado para a API da **Pollinations.ai** para renderização visual.

### Controle de Custos e Tokens
*   **Log de IA:** A tabela `ai_logs` registra cada chamada, o modelo usado, a quantidade de tokens (input/output) e o custo estimado.
*   **User Credits:** Antes de cada geração, o hook `usePlan` verifica se o usuário tem saldo. Se tiver, o custo da operação é deduzido da tabela `user_credits`.

---

## 7. Configuração do Supabase

### Setup Inicial
O projeto depende de variáveis de ambiente para conectar ao projeto Supabase.
Arquivo `.env.local` (ou configuração da Vercel/Netlify):
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
GEMINI_API_KEY=sua-api-key-google
```

### Segurança (RLS - Row Level Security)
O sistema depende fortemente de RLS para segurança. O arquivo `services/adminService.ts` contém (em comentários ou documentação interna) os scripts SQL necessários para configurar as *Policies*.
*   Exemplo: Usuários só podem ler seus próprios créditos.
*   Exemplo: Apenas admins podem ler a tabela `logs`.

### Service Role
A chave `service_role` **NÃO** é utilizada no frontend por razões de segurança. Todas as operações administrativas são validadas via RLS baseadas na claim `role` do usuário autenticado ou em verificações na tabela `app_users`.

---

## 8. Próximos Passos (Roadmap Técnico)

1.  **Implementação de Webhooks de Pagamento:**
    *   Atualmente, o sistema gera links de pagamento (Mercado Pago/Stripe). O próximo passo é criar Edge Functions no Supabase para receber os Webhooks e aprovar transações automaticamente.
2.  **Sistema de Notificações:**
    *   Criar tabela `notifications` e usar Supabase Realtime para alertar usuários sobre término de gerações ou aprovação de pagamentos.
3.  **Refinamento de RLS:**
    *   Auditar todas as políticas de segurança para garantir isolamento total de dados entre tenants.
4.  **Otimização de Imagens:**
    *   Implementar upload automático das imagens geradas para o Supabase Storage (Bucket), pois atualmente elas são links temporários ou base64.

---

*Documentação gerada automaticamente para o sistema GDN_IA v1.0.5.*
