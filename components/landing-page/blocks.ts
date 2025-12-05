
export const addBlocks = (editor: any) => {
    const bm = editor.BlockManager;

    // --- CONVERSÃO ---
    bm.add('hero-capture', {
        label: 'Hero com Captura',
        category: 'Conversão',
        attributes: { class: 'fas fa-magnet' },
        content: `
          <section class="relative bg-gray-900 text-white py-24 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12 font-sans overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900 to-transparent z-0"></div>
            <div class="absolute right-0 top-0 w-1/2 h-full opacity-30 z-[-1] bg-cover bg-center" style="background-image: url('https://placehold.co/800x600/333/666');"></div>
            
            <div class="relative z-10 max-w-2xl">
                <span class="inline-block py-1 px-3 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">Oferta Limitada</span>
                <h1 class="text-4xl md:text-6xl font-extrabold leading-tight mb-6">Título da Promessa Irresistível</h1>
                <p class="text-lg text-gray-300 mb-8 max-w-lg">Descreva a dor do cliente e como sua solução resolve isso em tempo recorde. Foco no benefício final.</p>
                <div class="flex items-center gap-4 text-sm text-gray-400">
                    <span class="flex items-center"><i class="fas fa-check text-green-500 mr-2"></i> Garantia de 30 dias</span>
                    <span class="flex items-center"><i class="fas fa-check text-green-500 mr-2"></i> Acesso Imediato</span>
                </div>
            </div>

            <div class="relative z-10 w-full max-w-md bg-white text-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-200">
                <h3 class="text-2xl font-bold text-center mb-2">Comece Agora</h3>
                <p class="text-center text-gray-500 text-sm mb-6">Preencha para liberar seu acesso.</p>
                <form class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome</label>
                        <input type="text" placeholder="Digite seu nome" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Seu E-mail</label>
                        <input type="email" placeholder="seu@email.com" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <button type="button" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg text-lg shadow-lg shadow-red-200 transition transform hover:-translate-y-1">
                        QUERO MEU ACESSO
                    </button>
                </form>
                <p class="text-xs text-center text-gray-400 mt-4"><i class="fas fa-lock"></i> Seus dados estão 100% seguros.</p>
            </div>
          </section>
        `
    });

    bm.add('benefits-grid', {
        label: 'Benefícios (Grid)',
        category: 'Conversão',
        attributes: { class: 'fas fa-th-large' },
        content: `
          <section class="py-20 bg-white font-sans">
            <div class="max-w-6xl mx-auto px-6">
                <div class="text-center mb-16">
                    <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Por que escolher nossa solução?</h2>
                    <p class="text-gray-500 max-w-2xl mx-auto">Não vendemos apenas uma ferramenta, entregamos resultados.</p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-10">
                    <!-- Item 1 -->
                    <div class="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition">
                        <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                            <i class="fas fa-clock"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Economia de Tempo</h3>
                        <p class="text-gray-600 leading-relaxed">Automatize tarefas repetitivas e ganhe horas livres no seu dia para focar no que importa.</p>
                    </div>
                    <!-- Item 2 -->
                    <div class="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition">
                        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Resultados Comprovados</h3>
                        <p class="text-gray-600 leading-relaxed">Metodologia validada por milhares de clientes que já atingiram seus objetivos.</p>
                    </div>
                    <!-- Item 3 -->
                    <div class="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition">
                        <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                            <i class="fas fa-headset"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Suporte Premium</h3>
                        <p class="text-gray-600 leading-relaxed">Time de especialistas pronto para te ajudar a qualquer momento via chat ou e-mail.</p>
                    </div>
                </div>
            </div>
          </section>
        `
    });

    bm.add('pricing-table', {
        label: 'Tabela de Preços',
        category: 'Conversão',
        attributes: { class: 'fas fa-tags' },
        content: `
          <section class="py-16 bg-white text-gray-900 font-sans">
            <div class="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
              <!-- Basic -->
              <div class="border border-gray-200 rounded-2xl p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
                <h3 class="font-bold text-xl mb-4 text-gray-600">Básico</h3>
                <div class="text-4xl font-extrabold mb-6">R$ 0<span class="text-sm font-normal text-gray-500">/mês</span></div>
                <ul class="text-left space-y-3 mb-8 text-gray-600 text-sm">
                  <li><i class="fas fa-check text-green-500 mr-2"></i> Feature 1</li>
                  <li><i class="fas fa-check text-green-500 mr-2"></i> Feature 2</li>
                </ul>
                <button class="w-full border border-gray-900 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-50 transition">Começar</button>
              </div>
              <!-- Pro -->
              <div class="border-2 border-blue-600 rounded-2xl p-8 text-center relative shadow-xl transform md:-translate-y-4 bg-blue-50">
                <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Mais Popular</div>
                <h3 class="font-bold text-xl mb-4 text-blue-900">Profissional</h3>
                <div class="text-4xl font-extrabold mb-6 text-blue-900">R$ 99<span class="text-sm font-normal text-gray-500">/mês</span></div>
                <ul class="text-left space-y-3 mb-8 text-gray-700 text-sm">
                  <li><i class="fas fa-check text-blue-500 mr-2"></i> Tudo do Básico</li>
                  <li><i class="fas fa-check text-blue-500 mr-2"></i> Feature PRO 1</li>
                  <li><i class="fas fa-check text-blue-500 mr-2"></i> Feature PRO 2</li>
                </ul>
                <button class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">Assinar Agora</button>
              </div>
              <!-- Enterprise -->
              <div class="border border-gray-200 rounded-2xl p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
                <h3 class="font-bold text-xl mb-4 text-gray-600">Empresarial</h3>
                <div class="text-4xl font-extrabold mb-6">R$ 299<span class="text-sm font-normal text-gray-500">/mês</span></div>
                <ul class="text-left space-y-3 mb-8 text-gray-600 text-sm">
                  <li><i class="fas fa-check text-green-500 mr-2"></i> Tudo do Pro</li>
                  <li><i class="fas fa-check text-green-500 mr-2"></i> Suporte VIP</li>
                </ul>
                <button class="w-full border border-gray-900 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-50 transition">Falar com Vendas</button>
              </div>
            </div>
          </section>
        `
    });

    bm.add('testimonials', {
        label: 'Depoimentos',
        category: 'Conversão',
        attributes: { class: 'fas fa-comment-alt' },
        content: `
          <section class="py-20 bg-gray-50 font-sans">
            <div class="max-w-6xl mx-auto px-4">
              <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">O que dizem nossos clientes</h2>
              <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">JS</div>
                    <div>
                      <h4 class="font-bold text-gray-900">João Silva</h4>
                      <p class="text-xs text-gray-500">CEO, Tech Ltda</p>
                    </div>
                  </div>
                  <p class="text-gray-600 text-sm italic leading-relaxed">"Esta ferramenta mudou completamente a forma como trabalhamos. A produtividade aumentou 200%. Recomendo a todos!"</p>
                  <div class="text-yellow-400 mt-4 text-xs"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                </div>
                <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">MS</div>
                    <div>
                      <h4 class="font-bold text-gray-900">Maria Souza</h4>
                      <p class="text-xs text-gray-500">Marketing, Agência X</p>
                    </div>
                  </div>
                  <p class="text-gray-600 text-sm italic leading-relaxed">"Simplesmente incrível. O suporte é rápido e as funcionalidades são top de linha. Vale cada centavo."</p>
                  <div class="text-yellow-400 mt-4 text-xs"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                </div>
                <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">CP</div>
                    <div>
                      <h4 class="font-bold text-gray-900">Carlos Pereira</h4>
                      <p class="text-xs text-gray-500">Freelancer</p>
                    </div>
                  </div>
                  <p class="text-gray-600 text-sm italic leading-relaxed">"Melhor investimento que fiz este ano. O retorno sobre o investimento foi imediato."</p>
                  <div class="text-yellow-400 mt-4 text-xs"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                </div>
              </div>
            </div>
          </section>
        `
    });

    bm.add('scarcity-timer', {
        label: 'Timer Escassez',
        category: 'Conversão',
        attributes: { class: 'fas fa-hourglass-half' },
        content: `
          <div class="bg-red-600 text-white p-4 text-center shadow-md">
            <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
              <span class="font-bold uppercase tracking-wider text-sm flex items-center"><i class="fas fa-fire mr-2 animate-pulse"></i> Oferta por tempo limitado!</span>
              <div class="flex gap-2 font-mono text-xl font-bold">
                <span class="bg-red-800 px-3 py-1 rounded">00</span>:
                <span class="bg-red-800 px-3 py-1 rounded">14</span>:
                <span class="bg-red-800 px-3 py-1 rounded">59</span>
              </div>
              <button class="bg-white text-red-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition shadow-lg">Aproveitar Agora</button>
            </div>
          </div>
        `
    });

    bm.add('guarantee-seal', {
        label: 'Garantia',
        category: 'Conversão',
        attributes: { class: 'fas fa-shield-alt' },
        content: `
          <div class="flex flex-col items-center justify-center p-8 bg-gray-50 border border-gray-200 rounded-xl text-center max-w-lg mx-auto my-8 font-sans">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl text-green-600 mb-4 shadow-sm">
              <i class="fas fa-check-circle"></i>
            </div>
            <h3 class="font-bold text-xl text-gray-900 mb-2">Garantia de 30 Dias</h3>
            <p class="text-gray-600 text-sm leading-relaxed">Risco Zero. Teste nossa plataforma por 30 dias. Se você não gostar por qualquer motivo, devolvemos 100% do seu dinheiro. Sem perguntas.</p>
          </div>
        `
    });

    // --- ESTRUTURA ---
    bm.add('hero-section', {
        label: 'Hero Section',
        category: 'Estrutura',
        attributes: { class: 'fas fa-heading' },
        content: `
          <section class="relative bg-gray-900 text-white py-32 px-6 text-center font-sans">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">Título Impactante Aqui</h1>
              <p class="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">Uma subheadline persuasiva que explica o valor do seu produto em poucas palavras e convence o visitante a continuar lendo.</p>
              <div class="flex flex-col sm:flex-row justify-center gap-4">
                <button class="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition shadow-lg shadow-green-900/50">Começar Agora</button>
                <button class="bg-transparent border border-gray-600 hover:border-white text-white font-bold py-4 px-8 rounded-lg text-lg transition">Saiba Mais</button>
              </div>
            </div>
          </section>
        `
    });

    bm.add('faq-accordion', {
        label: 'FAQ',
        category: 'Estrutura',
        attributes: { class: 'fas fa-question-circle' },
        content: `
          <section class="py-16 bg-white max-w-3xl mx-auto px-4 font-sans">
            <h2 class="text-3xl font-bold text-center text-gray-900 mb-10">Perguntas Frequentes</h2>
            <div class="space-y-4">
              <details class="group bg-gray-50 p-6 rounded-xl cursor-pointer border border-gray-200">
                <summary class="font-bold text-gray-900 flex justify-between items-center list-none">
                  Como funciona o pagamento?
                  <span class="transition group-open:rotate-180"><i class="fas fa-chevron-down text-gray-400"></i></span>
                </summary>
                <p class="text-gray-600 mt-4 text-sm leading-relaxed">Aceitamos cartões de crédito, PIX e boleto bancário. O acesso é liberado imediatamente após a confirmação.</p>
              </details>
              <details class="group bg-gray-50 p-6 rounded-xl cursor-pointer border border-gray-200">
                <summary class="font-bold text-gray-900 flex justify-between items-center list-none">
                  Posso cancelar a qualquer momento?
                  <span class="transition group-open:rotate-180"><i class="fas fa-chevron-down text-gray-400"></i></span>
                </summary>
                <p class="text-gray-600 mt-4 text-sm leading-relaxed">Sim, não há fidelidade. Você pode cancelar sua assinatura quando quiser diretamente pelo painel.</p>
              </details>
              <details class="group bg-gray-50 p-6 rounded-xl cursor-pointer border border-gray-200">
                <summary class="font-bold text-gray-900 flex justify-between items-center list-none">
                  Tem garantia?
                  <span class="transition group-open:rotate-180"><i class="fas fa-chevron-down text-gray-400"></i></span>
                </summary>
                <p class="text-gray-600 mt-4 text-sm leading-relaxed">Sim, oferecemos 7 dias de garantia incondicional. Se não gostar, devolvemos seu dinheiro.</p>
              </details>
            </div>
          </section>
        `
    });

    bm.add('footer-simple', {
        label: 'Footer Simples',
        category: 'Estrutura',
        attributes: { class: 'fas fa-shoe-prints' },
        content: `
          <footer class="bg-gray-900 text-gray-400 py-12 px-4 border-t border-gray-800 font-sans">
            <div class="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
              <div class="col-span-1 md:col-span-2">
                <h4 class="text-white font-bold mb-4 text-lg">Sua Empresa</h4>
                <p class="text-sm text-gray-500 mb-4 max-w-sm">A melhor solução para o seu negócio. Transformando ideias em realidade desde 2023.</p>
              </div>
              <div>
                <h4 class="text-white font-bold mb-4">Empresa</h4>
                <ul class="space-y-2 text-sm">
                  <li><a href="#" class="hover:text-white transition">Sobre Nós</a></li>
                  <li><a href="#" class="hover:text-white transition">Contato</a></li>
                  <li><a href="#" class="hover:text-white transition">Blog</a></li>
                </ul>
              </div>
              <div>
                <h4 class="text-white font-bold mb-4">Legal</h4>
                <ul class="space-y-2 text-sm">
                  <li><a href="#" class="hover:text-white transition">Termos de Uso</a></li>
                  <li><a href="#" class="hover:text-white transition">Privacidade</a></li>
                </ul>
              </div>
            </div>
            <div class="text-center text-xs border-t border-gray-800 pt-8 text-gray-600">
              &copy; 2023 Sua Empresa. Todos os direitos reservados.
            </div>
          </footer>
        `
    });

    // --- BÁSICO ---
    bm.add('text-block', {
        label: 'Texto',
        category: 'Básico',
        content: '<div class="p-4 text-gray-600"><p>Insira seu texto aqui...</p></div>'
    });
    
    bm.add('image-block', {
        label: 'Imagem',
        category: 'Básico',
        content: '<img src="https://via.placeholder.com/600x400" class="w-full h-auto rounded-lg shadow-md" />'
    });
};
