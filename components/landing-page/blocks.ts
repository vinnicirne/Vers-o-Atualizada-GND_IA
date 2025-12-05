
export const addBlocks = (editor: any) => {
    const bm = editor.BlockManager;

    // =========================================
    // CATEGORIA: INSTITUCIONAL
    // =========================================

    bm.add('navbar-simple', {
        label: 'Menu / Navbar',
        category: 'Institucional',
        attributes: { class: 'fas fa-bars' },
        content: `
          <header class="bg-white border-b border-gray-200 sticky top-0 z-50 font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex-shrink-0 flex items-center gap-2">
                        <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white"><i class="fas fa-cube"></i></div>
                        <span class="font-bold text-xl text-gray-900">Logo</span>
                    </div>
                    <div class="hidden md:flex space-x-8 items-center">
                        <a href="#" class="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition">Início</a>
                        <a href="#sobre" class="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition">Sobre</a>
                        <a href="#servicos" class="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition">Serviços</a>
                        <a href="#contato" class="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition text-sm font-bold shadow-sm">Contato</a>
                    </div>
                </div>
            </div>
          </header>
        `
    });

    bm.add('hero-section', {
        label: 'Hero Section',
        category: 'Institucional',
        attributes: { class: 'fas fa-heading' },
        content: `
          <section class="relative bg-gray-900 text-white py-32 px-6 text-center font-sans">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">Título Impactante Aqui</h1>
              <p class="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">Uma subheadline persuasiva que explica o valor do seu produto em poucas palavras e convence o visitante a continuar lendo.</p>
              <div class="flex flex-col sm:flex-row justify-center gap-4">
                <a href="#cta" class="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition shadow-lg shadow-green-900/50 inline-block">Começar Agora</a>
                <a href="#more" class="bg-transparent border border-gray-600 hover:border-white text-white font-bold py-4 px-8 rounded-lg text-lg transition inline-block">Saiba Mais</a>
              </div>
            </div>
          </section>
        `
    });

    bm.add('about-section', {
        label: 'Sobre Nós',
        category: 'Institucional',
        attributes: { class: 'fas fa-info-circle' },
        content: `
          <section id="sobre" class="py-20 bg-white font-sans overflow-hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                    <div class="relative mb-12 lg:mb-0">
                        <img src="https://placehold.co/600x500" class="relative z-10 rounded-2xl shadow-xl w-full object-cover" alt="Sobre Nós">
                    </div>
                    <div>
                        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
                            Transformando ideias em <span class="text-blue-600">resultados reais</span>.
                        </h2>
                        <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                            Nossa missão é empoderar empresas através de soluções inovadoras.
                        </p>
                        <a href="#" class="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-md text-white bg-gray-900 hover:bg-gray-800 md:py-4 md:text-lg shadow-lg transition">
                            Conheça Nossa História
                        </a>
                    </div>
                </div>
            </div>
          </section>
        `
    });

    bm.add('services-grid', {
        label: 'Serviços',
        category: 'Institucional',
        attributes: { class: 'fas fa-briefcase' },
        content: `
          <section id="servicos" class="py-24 bg-gray-50 font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 mb-4">Nossos Serviços</h2>
                <p class="text-xl text-gray-500 max-w-2xl mx-auto">Soluções completas para seu negócio.</p>
              </div>
              <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100">
                  <div class="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-blue-200">
                    <i class="fas fa-rocket"></i>
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-3">Consultoria</h3>
                  <p class="text-gray-600 mb-6 leading-relaxed">Planejamento estratégico para seu crescimento.</p>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100">
                  <div class="w-14 h-14 bg-purple-600 text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-purple-200">
                    <i class="fas fa-code"></i>
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-3">Desenvolvimento</h3>
                  <p class="text-gray-600 mb-6 leading-relaxed">Sites e sistemas de alta performance.</p>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100">
                  <div class="w-14 h-14 bg-green-600 text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-green-200">
                    <i class="fas fa-chart-pie"></i>
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-3">Marketing</h3>
                  <p class="text-gray-600 mb-6 leading-relaxed">Gestão de tráfego e conteúdo.</p>
                </div>
              </div>
            </div>
          </section>
        `
    });

    // =========================================
    // CATEGORIA: CONVERSÃO
    // =========================================

    bm.add('cta-banner', {
        label: 'Banner CTA',
        category: 'Conversão',
        attributes: { class: 'fas fa-bullhorn' },
        content: `
          <section id="cta" class="py-12 bg-blue-600 font-sans">
            <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div>
                    <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Pronto para começar?</h2>
                    <p class="text-blue-100 text-lg">Junte-se a centenas de clientes satisfeitos.</p>
                </div>
                <a href="#" class="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105 whitespace-nowrap inline-block">
                    Falar com Consultor
                </a>
            </div>
          </section>
        `
    });

    bm.add('contact-form', {
        label: 'Formulário',
        category: 'Conversão',
        attributes: { class: 'fas fa-envelope' },
        content: `
          <section id="contato" class="py-20 bg-white font-sans">
            <div class="max-w-4xl mx-auto px-4">
                <div class="bg-gray-50 p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 class="font-bold text-2xl text-center text-gray-900 mb-6">Entre em Contato</h3>
                    <form class="space-y-5">
                      <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                        <input type="text" class="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 outline-none transition bg-white" placeholder="Seu nome">
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                        <input type="email" class="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 outline-none transition bg-white" placeholder="seu@email.com">
                      </div>
                      <button type="button" class="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition shadow-lg">
                        Enviar Mensagem
                      </button>
                    </form>
                </div>
            </div>
          </section>
        `
    });

    // =========================================
    // CATEGORIA: BÁSICO
    // =========================================

    bm.add('text-block', {
        label: 'Texto Simples',
        category: 'Básico',
        attributes: { class: 'fas fa-font' },
        content: '<div class="p-4 text-gray-600 font-sans"><p>Clique aqui para editar este texto. Use a aba "Estilo" para alterar a fonte, cor e tamanho.</p></div>'
    });
    
    bm.add('image-block', {
        label: 'Imagem',
        category: 'Básico',
        attributes: { class: 'fas fa-image' },
        content: '<img src="https://via.placeholder.com/600x400" class="w-full h-auto rounded-lg shadow-md" alt="Imagem Exemplo" />'
    });

    bm.add('button-block', {
        label: 'Botão',
        category: 'Básico',
        attributes: { class: 'fas fa-mouse-pointer' },
        content: '<a href="#" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">Clique Aqui</a>'
    });
};
