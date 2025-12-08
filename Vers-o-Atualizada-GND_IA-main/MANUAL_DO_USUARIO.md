
# 📘 Manual Oficial do Usuário - GDN_IA

Bem-vindo ao **GDN_IA**! Este manual aborda desde o uso básico das ferramentas criativas até a gestão avançada do sistema para administradores.

---

## 🎨 Parte 1: Creator Suite (Ferramentas de Criação)

Acesse o **Dashboard** para ver todas as ferramentas disponíveis. O acesso depende do seu plano (Free, Basic, Standard, Premium).

### 1. 📰 GDN Notícias (News Generator)
Cria artigos jornalísticos completos baseados em fatos reais.
*   **Entrada:** Digite um tema (ex: "Resultado da F1 hoje").
*   **Saída:** Título, texto otimizado para SEO, meta-descrição e slug.
*   **Dica:** Ative "Gerar Áudio" para narrar a notícia automaticamente.

### 2. 🌐 Criador de Sites (Web Builder)
Gera sites completos com design profissional.
*   **Modo Institucional:** Peça "Site para advocacia". A IA cria Home, Sobre, Serviços e Contato.
*   **Modo Landing Page:** Peça "Página de venda para curso de inglês". A IA foca em conversão e CTAs.
*   **Editor:** Use o painel visual à direita para alterar cores, textos e baixar o HTML.

### 3. 🖼️ Studio de Arte IA
Cria imagens de alta resolução.
*   **Como usar:** Descreva a imagem (ex: "Gato astronauta cyberpunk 8k").
*   **Filtros:** Use a barra lateral para remover fundo, ajustar brilho ou aplicar estilo.

### 4. 📄 Criador de Currículos (Novo)
Gera currículos otimizados para ATS (sistemas de RH).
*   **Dados:** Preencha seus dados, experiências e a IA formata tudo em um design elegante HTML/PDF friendly.

### 5. 🔌 Integração N8N (Webhooks)
Envie o conteúdo gerado diretamente para outras plataformas.
1.  Clique no ícone de **Tomada** no topo.
2.  Insira a URL do seu Webhook (N8N, Zapier, Make).
3.  Ao gerar conteúdo, os dados serão enviados automaticamente se a opção estiver marcada.

---

## 💼 Parte 2: CRM & Funil de Vendas (Para Administradores)

O sistema possui um CRM integrado para capturar leads da Landing Page.

### Acessando o CRM
No menu lateral do Admin, clique em **CRM / Leads**.

### Funcionalidades:
1.  **Visualização de Leads:** Veja quem baixou o E-book ou se cadastrou na Landing Page.
2.  **Origem do Tráfego:** Identifique de onde o lead veio (Instagram, Google) através das tags `utm_source` e `utm_medium` exibidas na tabela.
3.  **Gestão de Status:** Mude o status do lead (Novo -> Qualificado -> Convertido).
4.  **Automação:** O sistema envia automaticamente o "Guia de Prompts" por e-mail quando um lead se cadastra na Landing Page.

---

## 🎨 Parte 3: Personalização (White Label)

Transforme o GDN_IA na sua própria plataforma SaaS.

1.  Vá em **Admin > Dashboard**.
2.  No menu lateral, procure por **White Label** (ou via configurações gerais dependendo da versão).
3.  **Opções:**
    *   **Nome do App:** Altere de "GDN_IA" para sua marca.
    *   **Cores:** Defina a cor Primária (Botões/Destaques) e Secundária (Fundo/Texto).
    *   **SEO:** Altere título da página e favicon.
    *   **Landing Page:** Edite os textos da página inicial (Hero, Features, Preços) sem tocar no código.

---

## 💰 Parte 4: Planos e Afiliados

### Gerenciando Planos
*   Como Admin, você pode criar planos personalizados (ex: "Plano Enterprise") que não aparecem na loja pública, mas podem ser atribuídos manualmente a usuários VIP.

### Sistema de Afiliados
*   Qualquer usuário pode se tornar afiliado clicando no ícone de "Aperto de Mão".
*   Eles recebem 20% de comissão (configurável no código) sobre pagamentos.
*   O Admin visualiza todas as comissões na aba **Usuários**.

---

## 🆘 Suporte e Dúvidas

Se encontrar erros (tela vermelha ou avisos), tire um print e envie para o suporte técnico. O sistema possui logs detalhados na aba **Admin > Logs** para facilitar a correção.
