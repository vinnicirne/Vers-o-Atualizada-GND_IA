
export const addBlocks = (editor: any, userId: string, supabaseUrl: string) => {
    const bm = editor.BlockManager;
    const captureUrl = `${supabaseUrl}/functions/v1/capture-lead?uid=${userId}`;

    // Helper para ícones grandes
    const icon = (cls: string, label: string) => `
        <div class="flex flex-col items-center justify-center w-full h-full">
            <i class="${cls} text-2xl mb-2"></i>
            <div class="text-[10px] uppercase font-bold tracking-wide">${label}</div>
        </div>
    `;

    // =========================================
    // CATEGORIA: SOCIAL MEDIA
    // =========================================
    
    bm.add('social-post-square', {
        label: icon('fab fa-instagram', 'Post 1:1'),
        category: 'Social Media',
        content: `
            <div class="w-[600px] h-[600px] bg-white relative overflow-hidden flex flex-col items-center justify-center shadow-lg mx-auto my-4 text-center p-8" style="aspect-ratio: 1/1; max-width: 100%;">
                <h2 class="text-4xl font-bold text-gray-900 mb-4 z-10 relative">Título do Post</h2>
                <p class="text-xl text-gray-600 z-10 relative">Sua mensagem incrível aqui.</p>
                <div class="absolute inset-0 bg-gray-100 opacity-20 pointer-events-none"></div>
            </div>
        `
    });

    bm.add('social-story', {
        label: icon('fas fa-mobile-alt', 'Story 9:16'),
        category: 'Social Media',
        content: `
            <div class="w-[360px] h-[640px] bg-gradient-to-b from-purple-600 to-blue-500 relative overflow-hidden flex flex-col items-center justify-center shadow-lg mx-auto my-4 text-center p-6 text-white" style="aspect-ratio: 9/16; max-width: 100%;">
                <h2 class="text-3xl font-bold mb-6 z-10 relative">Novidade!</h2>
                <p class="text-lg z-10 relative">Arraste pra cima.</p>
            </div>
        `
    });

    bm.add('youtube-thumb', {
        label: icon('fab fa-youtube', 'Capa YT'),
        category: 'Social Media',
        content: `
            <div class="w-[640px] h-[360px] bg-gray-900 relative overflow-hidden flex items-center justify-center shadow-lg mx-auto my-4 text-center p-8 text-white" style="aspect-ratio: 16/9; max-width: 100%;">
                <h1 class="text-5xl font-extrabold text-yellow-400 uppercase tracking-tighter drop-shadow-lg z-10 relative">TÍTULO CHAMATIVO</h1>
                <div class="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-black/80 to-transparent"></div>
            </div>
        `
    });

    // =========================================
    // CATEGORIA: LEAD CAPTURE (NOVO)
    // =========================================

    bm.add('lead-capture-form', {
        label: icon('fas fa-envelope-open-text', 'Captura Lead'),
        category: 'Lead Capture',
        content: `
            <section class="py-16 bg-gray-50 w-full font-sans">
                <div class="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div class="text-center mb-6">
                        <h3 class="text-2xl font-bold text-gray-800">Inscreva-se Agora</h3>
                        <p class="text-gray-500 text-sm mt-1">Receba novidades exclusivas.</p>
                    </div>
                    <form action="${captureUrl}" method="POST" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Nome</label>
                            <input type="text" name="name" placeholder="Seu nome" class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                            <input type="email" name="email" placeholder="seu@email.com" class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Telefone (Opcional)</label>
                            <input type="tel" name="phone" placeholder="(11) 99999-9999" class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                        </div>
                        
                        <!-- Redirecionamento Opcional (Descomente e edite value para ativar) -->
                        <!-- <input type="hidden" name="redirect" value="https://seusite.com/obrigado.html" /> -->

                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition transform hover:-translate-y-0.5">
                            Enviar Dados
                        </button>
                        <p class="text-center text-[10px] text-gray-400 mt-3">
                            <i class="fas fa-lock"></i> Seus dados estão seguros.
                        </p>
                    </form>
                </div>
            </section>
        `
    });

    // =========================================
    // CATEGORIA: ESTRUTURA
    // =========================================
    bm.add('section-block', {
        label: icon('far fa-square', 'Seção'),
        category: 'Estrutura',
        content: `<section class="py-12 px-4 bg-transparent min-h-[100px] border-2 border-dashed border-gray-300/50 flex items-center justify-center text-gray-400">Arraste conteúdo aqui</section>`
    });

    bm.add('grid-2', {
        label: icon('fas fa-columns', '2 Colunas'),
        category: 'Estrutura',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full">
                <div class="min-h-[100px] border-2 border-dashed border-gray-300/50 p-4 flex items-center justify-center text-gray-400">Coluna 1</div>
                <div class="min-h-[100px] border-2 border-dashed border-gray-300/50 p-4 flex items-center justify-center text-gray-400">Coluna 2</div>
            </div>
        `
    });

    bm.add('grid-3', {
        label: icon('fas fa-table', '3 Colunas'),
        category: 'Estrutura',
        content: `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 w-full">
                <div class="min-h-[100px] border-2 border-dashed border-gray-300/50 p-4">1</div>
                <div class="min-h-[100px] border-2 border-dashed border-gray-300/50 p-4">2</div>
                <div class="min-h-[100px] border-2 border-dashed border-gray-300/50 p-4">3</div>
            </div>
        `
    });

    // =========================================
    // CATEGORIA: INSTITUCIONAL
    // =========================================

    bm.add('navbar-simple', {
        label: icon('fas fa-bars', 'Navbar'),
        category: 'Institucional',
        content: `
          <header class="bg-white border-b border-gray-200 sticky top-0 z-50 font-sans w-full">
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
        label: icon('fas fa-star', 'Hero'),
        category: 'Institucional',
        content: `
          <section class="relative bg-gray-900 text-white py-32 px-6 text-center font-sans w-full">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">Título Impactante Aqui</h1>
              <p class="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">Uma subheadline persuasiva que explica o valor do seu produto em poucas palavras.</p>
              <div class="flex flex-col sm:flex-row justify-center gap-4">
                <a href="#" class="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition shadow-lg shadow-green-900/50 inline-block">Começar Agora</a>
              </div>
            </div>
          </section>
        `
    });

    bm.add('about-section', {
        label: icon('fas fa-info-circle', 'Sobre'),
        category: 'Institucional',
        content: `
          <section id="sobre" class="py-20 bg-white font-sans overflow-hidden w-full">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                    <div class="relative mb-12 lg:mb-0">
                        <img src="https://via.placeholder.com/600x500" class="relative z-10 rounded-2xl shadow-xl w-full object-cover" alt="Sobre Nós">
                    </div>
                    <div>
                        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
                            Transformando ideias em <span class="text-blue-600">resultados reais</span>.
                        </h2>
                        <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                            Nossa missão é empoderar empresas através de soluções inovadoras.
                        </p>
                    </div>
                </div>
            </div>
          </section>
        `
    });

    // =========================================
    // CATEGORIA: CONTEÚDO
    // =========================================

    bm.add('feature-split-right', {
        label: icon('fas fa-images', 'Feature'),
        category: 'Conteúdo',
        content: `
            <section class="py-16 bg-white w-full">
                <div class="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">Título do Recurso</h3>
                        <p class="text-gray-600 text-lg leading-relaxed">Descreva o benefício principal aqui. Use este espaço para convencer o visitante.</p>
                        <ul class="mt-6 space-y-3">
                            <li class="flex items-center text-gray-700"><i class="fas fa-check text-green-500 mr-2"></i> Benefício 1</li>
                            <li class="flex items-center text-gray-700"><i class="fas fa-check text-green-500 mr-2"></i> Benefício 2</li>
                        </ul>
                    </div>
                    <div class="relative">
                        <img src="https://via.placeholder.com/600x400" class="rounded-xl shadow-lg w-full" alt="Feature">
                    </div>
                </div>
            </section>
        `
    });

    bm.add('cta-banner', {
        label: icon('fas fa-bullhorn', 'Banner CTA'),
        category: 'Conteúdo',
        content: `
            <section class="py-12 bg-blue-600 text-white w-full">
                <div class="max-w-5xl mx-auto px-4 text-center">
                    <h2 class="text-3xl font-bold mb-4">Pronto para começar?</h2>
                    <p class="text-blue-100 mb-8 text-lg">Junte-se a milhares de clientes satisfeitos hoje mesmo.</p>
                    <a href="#" class="bg-white text-blue-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-100 transition shadow-lg inline-block">Inscrever-se Agora</a>
                </div>
            </section>
        `
    });

    // =========================================
    // CATEGORIA: BÁSICO
    // =========================================

    bm.add('text-block', {
        label: icon('fas fa-font', 'Texto'),
        category: 'Básico',
        content: '<div class="p-4 text-gray-600 font-sans"><p>Clique duas vezes para editar este texto.</p></div>'
    });
    
    bm.add('image-block', {
        label: icon('fas fa-image', 'Imagem'),
        category: 'Básico',
        content: '<img src="https://via.placeholder.com/600x400" class="w-full h-auto rounded-lg shadow-md" alt="Imagem Exemplo" />'
    });

    bm.add('button-block', {
        label: icon('fas fa-mouse-pointer', 'Botão'),
        category: 'Básico',
        content: '<a href="#" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition text-center">Clique Aqui</a>'
    });
};
