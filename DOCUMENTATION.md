
# Documentação Oficial - GND_IA

## 📘 Documentação do Usuário

### 1. O que é o GND_IA?

O **GND_IA (Gerador de Notícias Inteligente & Creator Suite)** é uma plataforma SaaS completa para criação de conteúdo digital utilizando Inteligência Artificial Generativa. A ferramenta foi projetada para eliminar o bloqueio criativo e acelerar a produção de notícias, imagens, sites e textos persuasivos.

### 2. Como Funciona?

O fluxo de uso é simples e direto:

1.  **Cadastro e Login**: Crie uma conta gratuita para acessar o painel.
2.  **Escolha de Ferramenta**: Selecione o modo desejado (ex: "GDN Notícias", "Studio de Arte IA", "Site Institucional").
3.  **Prompt (Comando)**: Descreva o que você deseja criar. Ex: *"Notícia sobre a final da libertadores"* ou *"Imagem de um gato astronauta"*.
4.  **Geração**: A IA processa seu pedido, aplica técnicas de SEO (para textos) ou renderização (para imagens) e entrega o resultado em segundos.
5.  **Exportação**: Copie o texto, baixe a imagem ou exporte o código HTML do seu novo site.

### 3. Planos e Créditos

O sistema opera com uma economia baseada em créditos. Cada plano oferece uma cota mensal.

| Plano | Créditos Mensais | Perfil Ideal | Preço |
| :--- | :--- | :--- | :--- |
| **Free** | 3 | Testes e curiosos | R$ 0,00 |
| **Básico** | 25 | Criadores iniciantes | R$ 49,99 |
| **Standard** | 50 | Profissionais de marketing | R$ 99,99 |
| **Premium** | 100 | Agências e Power Users | R$ 199,00 |

#### Custo por Geração
Cada ferramenta consome uma quantidade específica de créditos baseada na complexidade computacional:

*   **Notícias, Copy, Prompts**: 1 Crédito
*   **Texto para Voz (Áudio)**: 2 Créditos
*   **Social Media**: 3 Créditos
*   **Imagens IA**: 5 Créditos
*   **Landing Pages**: 15 Créditos
*   **Sites Institucionais**: 25 Créditos

### 4. Dicas para Melhores Resultados

*   **Seja Específico**: Em vez de "Futebol", digite "Análise tática da final da Copa do Brasil entre Flamengo e São Paulo".
*   **Use o Editor**: Para sites e landing pages, use o editor visual para ajustar textos antes de exportar.
*   **Feedback**: Sempre avalie o resultado. A IA aprende com suas notas (0 a 10) e melhora nas próximas tentativas.

---

## 🛠️ Documentação Técnica

### 1. Visão Geral da Arquitetura

O sistema utiliza uma arquitetura moderna **Client-Side / Serverless**, eliminando a necessidade de um backend monolítico tradicional.

*   **Frontend**: React 18, Vite, TypeScript.
*   **Estilização**: Tailwind CSS.
*   **Backend as a Service (BaaS)**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions).
*   **Motor de IA**:
    *   **Texto/Código**: Google Gemini Pro (`gemini-2.5-flash`) via Edge Functions.
    *   **Imagens**: Pollinations.ai (Stable Diffusion) via Edge Functions.

### 2. Especificações da API de Integração

A integração com sistemas externos (como o Plugin WordPress) é feita através das **Edge Functions do Supabase**, que atuam como proxies seguros para APIs de terceiros.

#### Autenticação
Todos os requests para as Edge Functions e o banco de dados exigem autenticação via JWT.

**Endpoint Base**: `https://bckujotuhhkagcqfiyye.supabase.co`

| Recurso | Método | Endpoint | Descrição |
| :--- | :--- | :--- | :--- |
| **Login** | POST | `/auth/v1/token?grant_type=password` | Obtém `access_token` e `refresh_token`. |
| **Créditos** | GET | `/rest/v1/user_credits` | Consulta saldo do usuário. |
| **Gerar IA** | POST | `/functions/v1/wp-gemini-proxy` | Gera conteúdo de IA de forma segura via proxy. |

#### Exemplo de Fluxo de Autenticação (Login)

**Requisição:**
```http
POST /auth/v1/token?grant_type=password HTTP/1.1
Host: bckujotuhhkagcqfiyye.supabase.co
apikey: [SUA_ANON_KEY]
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha_segura"
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario@exemplo.com"
  }
}
```

### 3. Estrutura de Dados (Database Schema)

O banco de dados PostgreSQL possui as seguintes tabelas principais:

#### Tabela `app_users`
Armazena dados públicos do perfil e configurações de afiliados.
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Vínculo com `auth.users`. |
| `full_name` | text | Nome de exibição. |
| `plan` | text | Plano atual (free, basic, premium). |
| `affiliate_code` | text | Código único para indicação. |
| `referred_by` | uuid | ID do usuário que indicou este perfil. |

#### Tabela `user_credits`
Controle de saldo.
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `user_id` | uuid (PK) | ID do usuário. |
| `credits` | int4 | Saldo atual. `-1` indica ilimitado (Admin). |

#### Tabela `news`
Histórico de gerações.
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | bigint (PK) | Identificador sequencial. |
| `titulo` | text | Título ou prompt curto. |
| `conteudo` | text | Resultado gerado (HTML ou Texto). |
| `tipo` | text | Ferramenta usada (ex: `news_generator`). |
| `status` | text | `approved`, `pending`, `rejected`. |

#### Tabela `api_keys`
Gerenciamento de chaves para desenvolvedores.
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `key_hash` | text | Chave completa (armazenada apenas na criação). |
| `key_prefix` | text | Prefixo visual para identificação. |
| `user_id` | uuid | Dono da chave. |

#### Tabela `user_integrations` (NOVA)
Armazena configurações sensíveis de integrações, como credenciais do WordPress (criptografadas).
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid (PK) | ID da integração. |
| `user_id` | uuid (FK) | Usuário proprietário. |
| `integration_type` | text | Tipo (ex: 'wordpress'). |
| `config_data` | jsonb | Dados da configuração (ex: URL, user, senha criptografada). |


### 4. Integração WordPress (Plugin)

O plugin oficial (`gdn-poster-pro`) agora utiliza **Edge Functions do Supabase** para todas as operações sensíveis, como autenticação e geração de conteúdo de IA.

**Fluxo de Funcionamento (Seguro):**
1.  **Configuração:** O usuário configura a **URL do Supabase**, a **Supabase Anon Key** e a **URL do Proxy Gemini (Edge Function)** no painel de admin do WordPress.
2.  **Autenticação**: O plugin envia e-mail/senha para o Supabase Auth (via a Anon Key).
3.  **Verificação & Geração**: Se houver saldo (verificado pela Edge Function), o plugin chama a **Edge Function `wp-gemini-proxy`** (que usa a `GEMINI_API_KEY` do servidor, não exposta no plugin) enviando o prompt. A dedução de créditos também é feita na Edge Function.
4.  **Publicação**: O texto retornado pela Edge Function é salvo como Rascunho no WordPress.

### 5. Tratamento de Erros e Suporte

Códigos de erro comuns na API:

*   **400 Bad Request**: Dados inválidos ou saldo insuficiente.
*   **401 Unauthorized**: Token JWT expirado ou inválido.
*   **403 Forbidden**: Bloqueio de firewall (WAF) ou violação de RLS (Row Level Security).
*   **429 Too Many Requests**: Limite de taxa excedido.

**Suporte Técnico:**
Para reportar bugs ou solicitar integração, entre em contato via `suporte@gdn.ia` ou consulte a aba "Logs" no painel administrativo.
