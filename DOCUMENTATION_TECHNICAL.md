

# 🏗️ Documentação Técnica do Sistema - GDN_IA

## 1. Visão Geral

### Nome do Sistema
**GDN_IA** (Gerador de Notícias Inteligente & Creator Suite)

### Objetivo Principal
O GDN_IA é uma plataforma SaaS (Software as a Service) focada em **Inteligência Artificial Generativa**. O sistema permite que usuários criem diversos tipos de conteúdo — notícias, imagens, sites, copys e áudio — utilizando um sistema híbrido de acesso (Visitante/Logado).

### Tecnologias Utilizadas
*   **Frontend:** React 18, Vite, TypeScript.
*   **Estilização:** Tailwind CSS, FontAwesome.
*   **Backend / BaaS:** Supabase (PostgreSQL, Auth, Realtime).
*   **Inteligência Artificial:**
    *   Google Gemini API (`gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`) para texto e áudio.
    *   Pollinations.ai para geração de imagens.
*   **Editor Visual:** GrapesJS (para Landing Pages e Sites).
*   **SEO Engine:** Algoritmos proprietários para análise léxica e geração de metadados.

---

## 2. Arquitetura de Funcionalidades

### Modo Visitante (Guest Mode)
Implementado no frontend para permitir degustação do produto.
*   **Estado:** Utiliza `localStorage.getItem('gdn_guest_credits')`.
*   **Inicialização:** Se a chave não existir, inicia com 3 créditos.
*   **Restrições:**
    *   O componente `ContentGenerator.tsx` recebe uma prop `guestAllowedModes`.
    *   Se o usuário não estiver logado (`!user`) e tentar acessar um modo fora da lista permitida (ex: Imagens), um modal de bloqueio (`showFeatureLockModal`) é exibido.
    *   Se os créditos locais acabarem, o modal `showGuestLimitModal` bloqueia a ação.

### Motor de SEO (`services/seoService.ts`)
Um sistema avançado para garantir pontuação alta em ferramentas como Yoast/Rank Math.
1.  **Engenharia Reversa de Keyword (Golden Keyword):**
    *   A função `suggestFocusKeyword` tokeniza o título e os primeiros 300 caracteres do conteúdo.
    *   Procura por interseções (palavras que aparecem em ambos).
    *   Prioriza bigramas (duas palavras, ex: "Inteligência Artificial") sobre unigramas.
2.  **Otimização de Metadados:**
    *   `generateOptimizedTags`: Cria matematicamente títulos e descrições dentro dos limites de caracteres do Google (Title < 60, Meta < 160).
    *   Se o título original for longo, ele é truncado mas a palavra-chave é preservada.
3.  **Análise de Score:**
    *   Calcula uma pontuação de 0 a 100 baseada em 5 critérios: Palavra-chave no Título, Palavra-chave na Introdução, Tamanho do Título, Tamanho do Conteúdo e Densidade.

### Processamento de Texto (`DashboardPage.tsx`)
Para garantir uma experiência de "Copiar e Colar" limpa:
*   **Regex de Limpeza:** A função `extractTitleAndContent` remove prefixos comuns gerados por LLMs, como `**Título:**`, `Headline:`, `Assunto:`.
*   **Separação:** O texto é dividido. A primeira linha (se for identificada como título) é removida do corpo do texto e armazenada no estado `resultTitle`. O restante vai para `resultText`.
*   **Display:** O componente `ResultDisplay` renderiza dois boxes visuais separados, cada um com seu botão de cópia.

---

## 3. Autenticação e Segurança

### Fluxo de Autenticação
O sistema utiliza o **Supabase Auth**.
*   **Sessão:** Persistida e monitorada via `UserContext.tsx`.
*   **Sincronização:** Ao logar, os créditos do banco (`user_credits`) substituem os créditos do localStorage.

### Segurança de Domínios (`services/adminService.ts`)
*   **Blacklist Interna:** Bloqueia domínios temporários (`teste.com`, `tempmail.com`).
*   **Validação Híbrida:** Configurada via painel Admin. Pode operar em modo Estrito (Allowlist) ou modo DNS (consulta pública de registros MX).

---

## 4. Banco de Dados e Afiliados

### Tabelas Principais
*   **`app_users`**: Perfil público.
*   **`user_credits`**: Saldo.
*   **`news`**: Histórico de conteúdo.
*   **`transactions`**: Histórico financeiro.
*   **`affiliate_logs`**: Registro de comissões.
*   **`system_config`**: Armazena JSONs de configuração (Planos, Pagamentos, IA).

### Planos e Personalização
Os planos são armazenados em um JSON na tabela `system_config`.
*   **Planos Customizados (Ocultos):** O sistema suporta planos que não aparecem na loja pública (propriedade `isActive: false`).
*   **Atribuição Manual:** O administrador pode criar um plano "Enterprise" ou "Especial", desativá-lo para o público, e atribuí-lo manualmente a um usuário específico através da edição de perfil no Admin Dashboard.

### Sistema de Afiliados
1.  **Tracking:** Parâmetro URL `?ref=CODE` salvo no `localStorage`.
2.  **Vínculo:** No cadastro (`signUp`), o código é lido e o ID do afiliado é salvo em `referred_by`.
3.  **Comissão:** Script `processAffiliateCommission` roda após cada transação aprovada, creditando 20% ao afiliado pai.

---

## 5. Serviços e Logs

### `services/loggerService.ts`
Logs centralizados operando em modo *Fire-and-Forget* para performance. Registra ações críticas (geração de conteúdo, alterações admin, erros de sistema).

### `services/geminiService.ts`
*   **System Prompt:** Instruções atualizadas para forçar a IA a colocar a palavra-chave no primeiro parágrafo (crucial para o Score 100 de SEO).
*   **Grounding:** Integração com Google Search para notícias recentes.

---

## 6. Integrações e Extensibilidade (N8N)

### Arquitetura de Webhooks
O sistema possui integração nativa com automações externas (Make/N8N) via **Webhooks POST**.

*   **Configuração:** O usuário insere a URL do Webhook no modal de Integrações.
*   **Persistência:** A URL é salva em `user_memory` (Chave: `n8n_config`) e sincronizada entre dispositivos.
*   **Disparo:** Pode ser manual (botão no resultado) ou automático (configurável).

### Payload JSON
O GDN_IA envia o seguinte payload para a URL configurada:

```json
{
  "title": "Título do Conteúdo",
  "content": "Conteúdo completo (Texto ou HTML)",
  "mode": "tipo_de_geracao (ex: news_generator)",
  "generated_at": "ISO 8601 Timestamp",
  "audio_base64": "String Base64 (se houver áudio)",
  "image_prompt": "Prompt usado (se for imagem)",
  "source": "gdn_ia_dashboard"
}
```

---

*Documentação técnica atualizada para o sistema GDN_IA v1.0.8.*
