# 📘 Manual Oficial do Sistema GDN_IA

Bem-vindo à documentação completa do **GDN_IA (Gerador de Notícias Inteligente & Creator Suite)**. Este documento detalha todas as funcionalidades da plataforma, divididas entre o perfil de **Usuário** e o perfil de **Administrador**.

---

# 👤 Parte 1: Manual do Usuário

O GDN_IA é uma suíte criativa impulsionada por Inteligência Artificial (Gemini 2.5) projetada para gerar notícias, imagens, landing pages, áudio e textos de marketing com alta qualidade.

## 1. Acesso e Conta
*   **Login/Cadastro:** Acesse a tela inicial. Se não tiver conta, clique em "Criar uma conta". Preencha Nome, Email e Senha.
*   **Recuperação de Senha:** Atualmente, a recuperação deve ser solicitada ao suporte/admin.
*   **Logout:** Clique no ícone de "Sair" (porta com seta) no cabeçalho superior direito.

## 2. Dashboard (Painel Principal)
Ao logar, você verá o Dashboard. Ele contém:
*   **Cabeçalho:** Mostra seu plano atual e saldo de créditos.
*   **Seletor de Ferramentas:** Uma grade com ícones representando cada módulo da IA (Notícias, Imagens, Landing Pages, etc.).
*   **Área de Geração:** Formulários que mudam de acordo com a ferramenta escolhida.

## 3. Ferramentas do Creator Suite

### 📰 GDN Notícias (News Generator)
Gera artigos jornalísticos baseados em fatos recentes.
*   **Como usar:** Selecione "GDN Notícias". No campo de texto, digite o tópico (ex: "Resultados da rodada do Brasileirão de ontem").
*   **Recurso de Busca:** A IA acessa o Google Search para buscar dados das últimas 48h.
*   **Áudio (TTS):** Marque a caixa "Gerar áudio da matéria" para criar uma narração automática do texto gerado.
*   **Custo:** Varia conforme o plano (geralmente 1 crédito).

### 🎨 Studio de Arte IA (Image Generation)
Cria imagens artísticas ou realistas.
*   **Como usar:** Selecione "Studio de Arte IA". Descreva a imagem (ex: "Um gato astronauta em Marte").
*   **Opções:**
    *   *Estilo:* Escolha entre Fotorealista, Cyberpunk, Anime, 3D Render, etc.
    *   *Proporção:* Quadrado (1:1), Paisagem (16:9) ou Stories (9:16).
*   **Editor de Imagem:** Após a geração, abre-se um estúdio onde você pode aplicar filtros (Brilho, Contraste, Blur) e baixar a imagem.
*   **Nota:** A IA primeiro aprimora seu prompt para inglês técnico e depois gera a imagem.

### 🌐 Gerador de Landing Page
Cria páginas web completas (HTML + Tailwind CSS).
*   **Como usar:** Descreva o produto/serviço (ex: "Página de venda de um curso de culinária vegana").
*   **Opções:** Escolha o *Tema* (Moderno, Dark, Luxo) e a *Cor Primária*.
*   **Editor Visual:** O sistema gera o código e abre um **Editor Visual (Drag & Drop)**. Você pode:
    *   Clicar nos textos para editar.
    *   Ver como fica no Mobile/Tablet.
    *   **Exportar:** Baixar o arquivo `.html` pronto para uso.

### 📱 Editor Visual (Social Media / Canva Structure)
Gera estruturas de posts para redes sociais.
*   **Como usar:** Peça um post (ex: "Post de Black Friday com fundo preto e texto amarelo").
*   **Funcionamento:** A IA gera uma estrutura HTML quadrada. O sistema abre o mesmo editor da Landing Page, focado em um canvas 1080x1080px, permitindo ajustes finos antes de tirar um print ou exportar.

### 🗣️ Texto para Voz (Text-to-Speech)
Converte texto escrito em fala natural.
*   **Como usar:** Cole o texto desejado e clique em gerar. Um player de áudio aparecerá para reprodução.

### ✍️ Gerador de Copy & Prompts
*   **Copy:** Cria textos persuasivos para vendas (AIDA, PAS).
*   **Prompts:** Cria instruções otimizadas para você usar em outras IAs (como ChatGPT ou Midjourney).

## 4. Planos e Créditos
*   **Visualização:** No topo da tela, clique no ícone de moedas ou no botão "Planos".
*   **Assinatura:** Escolha entre Free, Basic, Standard ou Premium. Cada um libera diferentes ferramentas e quantidade de créditos mensais.
*   **Compra Avulsa (Express):** Se seus créditos acabarem, você pode comprar um pacote avulso sem mudar de plano. Use a barra deslizante para escolher a quantidade e pague via Pix/Cartão.

## 5. Feedback
Após cada geração, um widget aparece perguntando "De 0 a 10, como ficou?".
*   **Importante:** O sistema possui memória. Se você der nota alta, ele tentará replicar o estilo. Se der nota baixa, ele evitará cometer o mesmo erro.

---

# 🛡️ Parte 2: Manual do Administrador

O painel administrativo é o centro de controle do GDN_IA. Apenas usuários com role `admin` ou `super_admin` têm acesso.

## 1. Acesso ao Admin
*   No Dashboard, clique no botão "Admin" no cabeçalho (canto superior direito).
*   Se o botão não aparecer, sua conta não tem permissão.

## 2. Dashboard Administrativo (Métricas)
Visão geral da saúde do sistema:
*   **Cards:** Total de Usuários, Usuários Ativos (7 dias), Créditos em Circulação e Faturamento Total.
*   **Gráfico:** Mostra a relação entre "Notícias Geradas" vs "Novos Usuários" nos últimos 7 dias.

## 3. Gerenciamento de Usuários (`Usuários`)
Lista completa de cadastros.
*   **Filtragem:** Por Role (User, Editor, Admin) ou Status (Ativo, Banido).
*   **Edição:** Clique em "Editar" para:
    *   Mudar a Role (ex: promover um usuário a Admin).
    *   Ajustar Créditos manualmente (ou definir como -1 para Ilimitado).
    *   Banir/Desativar usuários.
*   **Novo Usuário:** Botão para criar contas manualmente.

## 4. Gerenciamento de Notícias (`Notícias`)
Controle editorial do conteúdo gerado.
*   **Abas:**
    *   *Aprovação Pendente:* Notícias geradas que precisam de revisão (se o fluxo exigir).
    *   *Histórico:* Todas as notícias já processadas.
*   **Ações:**
    *   **Ver:** Ler a notícia completa e ver as fontes (links do Google).
    *   **Editar:** Corrigir título ou conteúdo (texto).
    *   **Aprovar/Rejeitar:** Muda o status da notícia.

## 5. Pagamentos e Financeiro (`Pagamentos`)
*   **Relatório de Transações:** Lista de todas as compras (Planos ou Créditos Avulsos). Mostra status (Pending, Approved), valor e método.
*   **Configurações (Aba):**
    *   **Gateways:** Configure as chaves de API (Public/Secret) do Stripe e Mercado Pago.
    *   **Pacotes de Créditos:** Crie ou edite os pacotes avulsos (ex: "Pacote Iniciante - 50 créditos por R$ 19,90").

## 6. Gerenciador de Planos (`Planos`)
Configure os níveis de assinatura do SaaS.
*   **Criar/Editar Plano:**
    *   *Nome/Preço/Créditos:* Defina a oferta básica.
    *   *Intervalo:* Mensal ou Anual.
    *   *Permissões de Serviço:* **CRÍTICO.** Aqui você define quais ferramentas cada plano pode acessar.
        *   Ex: Marque `image_generation` apenas no plano Premium.
        *   *Custo:* Defina quantos créditos cada uso da ferramenta consome.
*   **Ativo/Inativo:** Você pode ocultar planos antigos sem deletá-los.

## 7. Sistema Multi-IA (`Sistema Multi-IA`)
O cérebro do sistema. Gerencia as conexões com as IAs.
*   **Plataformas:** Ative/Desative Gemini, OpenAI ou Claude. Insira as **API Keys** aqui.
*   **Modelos:** Cadastre modelos específicos (ex: `gemini-2.5-flash`, `gpt-4o`). Defina se o modelo suporta Visão ou Áudio.
*   **Logs de Uso:** Monitore quantos tokens cada usuário está gastando e o custo estimado em Dólar.

## 8. Logs de Auditoria (`Logs`)
Rastreabilidade total.
*   Registra quem fez o quê, quando e onde.
*   Exemplos: "Admin X alterou créditos do User Y", "User Z gerou uma imagem".
*   Use os filtros para investigar problemas ou comportamentos suspeitos.

---

# 🔧 Resolução de Problemas (Troubleshooting)

### Tela Preta / Erro Crítico ao Iniciar
*   **Causa provável:** Erro de conexão com o Supabase ou Chaves de API faltando.
*   **Solução:** Verifique o console do navegador (F12). Se for erro de RLS (Row Level Security), o Admin deve rodar os scripts SQL de configuração no painel do Supabase.

### "Acesso Negado" ao gerar conteúdo
*   **Causa:** O plano do usuário não permite aquela ferramenta ou os créditos acabaram.
*   **Solução:** O usuário deve fazer upgrade ou comprar créditos. O Admin pode verificar as permissões do plano na aba "Planos".

### Imagem não carrega (Studio de Arte)
*   **Causa:** Lentidão na API da Pollinations ou bloqueio de navegador.
*   **Solução:** Tente gerar novamente. Verifique se não há bloqueadores de anúncio/trackers impedindo o carregamento do canvas.

### Landing Page desconfigurada no Editor
*   **Causa:** O CSS do Tailwind pode demorar alguns milissegundos para renderizar dentro do iframe.
*   **Solução:** Clique no botão "Mostrar/Ocultar Bordas" ou faça uma pequena edição de texto para forçar a re-renderização.

---

**GDN_IA v1.0.5** - Documentação gerada automaticamente.
