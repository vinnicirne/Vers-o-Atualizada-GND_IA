
export const addBlocks = (editor: any) => {
    const bm = editor.BlockManager;

    // =========================================
    // CATEGORIA: INSTITUCIONAL (NOVO)
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
                        <span class="font-bold text-xl text-gray-900">LogoEmpresa</span>
                    </div>
                    <div class="hidden md:flex space-x-8 items-center">
                        <a href="#" class="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition">Início</a>
                        <a href="#" class="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition">Sobre</a>
                        <a href="#" class="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition">Serviços</a>
                        <a href="#" class="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition text-sm font-bold shadow-sm">Fale Conosco</a>
                    </div>
                    <div class="flex items-center md:hidden">
                        <button type="button" class="text-gray-400 hover:text-gray-500 focus:outline-none p-2">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>
          </header>
        `
    });

    bm.add('about-section', {
        label: 'Sobre Nós',
        category: 'Institucional',
        attributes: { class: 'fas fa-info-circle' },
        content: `
          <section class="py-20 bg-white font-sans overflow-hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                    <div class="relative mb-12 lg:mb-0">
                        <div class="absolute -top-4 -left-4 w-24 h-24 bg-blue-100 rounded-full z-0 opacity-50"></div>
                        <div class="absolute -bottom-4 -right-4 w-32 h-32 bg-yellow-100 rounded-full z-0 opacity-50"></div>
                        <img src="https://placehold.co/600x500" class="relative z-10 rounded-2xl shadow-xl w-full object-cover transform hover:scale-[1.01] transition duration-500" alt="Sobre Nós">
                        <div class="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg z-20 border border-gray-100 hidden md:block animate-fade-in-up">
                            <div class="flex items-center gap-3">
                                <div class="bg-green-100 text-green-600 p-3 rounded-full"><i class="fas fa-trophy text-xl"></i></div>
                                <div>
                                    <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Experiência</p>
                                    <p class="font-bold text-gray-900 text-lg">+10 Anos de Mercado</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide mb-4">
                            Quem Somos
                        </div>
                        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
                            Transformando ideias em <span class="text-blue-600">resultados reais</span>.
                        </h2>
                        <p class="text-lg text-gray-600 mb-6 leading-relaxed">
                            Nossa missão é empoderar empresas através de soluções inovadoras. Combinamos tecnologia de ponta com uma abordagem humana para entregar excelência.
                        </p>
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start">
                                <div class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 mt-1">
                                    <i class="fas fa-check text-xs"></i>
                                </div>
                                <p class="ml-4 text-base text-gray-600">Equipe certificada e multidisciplinar.</p>
                            </div>
                            <div class="flex items-start">
                                <div class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 mt-1">
                                    <i class="fas fa-check text-xs"></i>
                                </div>
                                <p class="ml-4 text-base text-gray-600">Metodologia ágil focada em ROI.</p>
                            </div>
                            <div class="flex items-start">
                                <div class="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 mt-1">
                                    <i class="fas fa-check text-xs"></i>
                                </div>
                                <p class="ml-4 text-base text-gray-600">Suporte dedicado 24/7.</p>
                            </div>
                        </div>
                        <a href="#" class="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-md text-white bg-gray-900 hover:bg-gray-800 md:py-4 md:text-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                            Conheça Nossa História
                        </a>
                    </div>
                </div>
            </div>
          </section>
        `
    });

    bm.add('services-grid', {
        label: 'Grid de Serviços',
        category: 'Institucional',
        attributes: { class: 'fas fa-briefcase' },
        content: `
          <section class="py-24 bg-gray-50 font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div class="text-center mb-16">
                <span class="text-blue-600 font-bold tracking-wider text-xs uppercase bg-blue-100 px-3 py-1 rounded-full">Nossas Soluções</span>
                <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 mb-4">Serviços Especializados</h2>
                <p class="text-xl text-gray-500 max-w-2xl mx-auto">Tudo o que sua empresa precisa para crescer em um só lugar.</p>
              </div>
              <div class="grid md:grid-cols-3 gap-8">
                <!-- Service 1 -->
                <div class="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 group">
                  <div class="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-blue-200 group-hover:scale-110 transition">
                    <i class="fas fa-rocket"></i>
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-3">Consultoria Estratégica</h3>
                  <p class="text-gray-600 mb-6 leading-relaxed">Planejamento detalhado para identificar oportunidades e otimizar seus processos de negócio.</p>
                  <a href="#" class="text-blue-600 font-bold text-sm hover:text-blue-800 flex items-center group-hover:translate-x-2 transition">Saiba mais <i class="fas fa-arrow-right ml-2 text-xs"></i></a>
                </div>
                <!-- Service 2 -->
                <div class="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 group">
                  <div class="w-14 h-14 bg-purple-600 text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-purple-200 group-hover:scale-110 transition">
                    <i class="fas fa-code"></i>
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-3">Desenvolvimento Web</h3>
                  <p class="text-gray-600 mb-6 leading-relaxed">Sites, aplicativos e sistemas robustos desenvolvidos com as tecnologias mais modernas do mercado.</p>
                  <a href="#" class="text-purple-600 font-bold text-sm hover:text-purple-800 flex items-center group-hover:translate-x-2 transition">Saiba mais <i class="fas fa-arrow-right ml-2 text-xs"></i></a>
                </div>
                <!-- Service 3 -->
                <div class="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 group">
                  <div class="w-14 h-14 bg-green-600 text-white rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg shadow-green-200 group-hover:scale-110 transition">
                    <i class="fas fa-chart-pie"></i>
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 mb-3">Marketing Digital</h3>
                  <p class="text-gray-600 mb-6 leading-relaxed">Gestão de tráfego, SEO e conteúdo para aumentar sua visibilidade e converter leads em clientes.</p>
                  <a href="#" class="text-green-600 font-bold text-sm hover:text-green-800 flex items-center group-hover:translate-x-2 transition">Saiba mais <i class="fas fa-arrow-right ml-2 text-xs"></i></a>
                </div>
              </div>
            </div>
          </section>
        `
    });

    bm.add('gallery-grid', {
        label: 'Galeria de Fotos',
        category: 'Institucional',
        attributes: { class: 'fas fa-images' },
        content: `
          <section class="py-20 bg-white font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-12">
                    <h2 class="text-3xl font-bold text-gray-900">Nosso Portfólio</h2>
                    <p class="text-gray-500 mt-2">Confira alguns de nossos projetos recentes.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="relative group overflow-hidden rounded-lg aspect-[4/3]">
                        <img src="https://placehold.co/600x450/EEE/31343C" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="Projeto 1">
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <span class="text-white font-bold text-lg border border-white px-4 py-2 rounded">Ver Projeto</span>
                        </div>
                    </div>
                    <div class="relative group overflow-hidden rounded-lg aspect-[4/3]">
                        <img src="https://placehold.co/600x450/EEE/31343C" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="Projeto 2">
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <span class="text-white font-bold text-lg border border-white px-4 py-2 rounded">Ver Projeto</span>
                        </div>
                    </div>
                    <div class="relative group overflow-hidden rounded-lg aspect-[4/3]">
                        <img src="https://placehold.co/600x450/EEE/31343C" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="Projeto 3">
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <span class="text-white font-bold text-lg border border-white px-4 py-2 rounded">Ver Projeto</span>
                        </div>
                    </div>
                    <div class="relative group overflow-hidden rounded-lg aspect-[4/3]">
                        <img src="https://placehold.co/600x450/EEE/31343C" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="Projeto 4">
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <span class="text-white font-bold text-lg border border-white px-4 py-2 rounded">Ver Projeto</span>
                        </div>
                    </div>
                    <div class="relative group overflow-hidden rounded-lg aspect-[4/3]">
                        <img src="https://placehold.co/600x450/EEE/31343C" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="Projeto 5">
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <span class="text-white font-bold text-lg border border-white px-4 py-2 rounded">Ver Projeto</span>
                        </div>
                    </div>
                    <div class="relative group overflow-hidden rounded-lg aspect-[4/3]">
                        <img src="https://placehold.co/600x450/EEE/31343C" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="Projeto 6">
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <span class="text-white font-bold text-lg border border-white px-4 py-2 rounded">Ver Projeto</span>
                        </div>
                    </div>
                </div>
            </div>
          </section>
        `
    });

    bm.add('stats-bar', {
        label: 'Estatísticas',
        category: 'Institucional',
        attributes: { class: 'fas fa-chart-bar' },
        content: `
          <section class="bg-gray-900 text-white py-16 font-sans relative overflow-hidden">
            <div class="absolute inset-0 bg-blue-600/10"></div>
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
              <div class="p-4 transform hover:scale-105 transition duration-300">
                <div class="text-4xl md:text-5xl font-extrabold mb-2 text-blue-400">10+</div>
                <div class="text-gray-300 text-xs font-bold uppercase tracking-widest">Anos de Mercado</div>
              </div>
              <div class="p-4 border-l border-gray-800 transform hover:scale-105 transition duration-300">
                <div class="text-4xl md:text-5xl font-extrabold mb-2 text-blue-400">500+</div>
                <div class="text-gray-300 text-xs font-bold uppercase tracking-widest">Projetos Entregues</div>
              </div>
              <div class="p-4 border-l border-gray-800 transform hover:scale-105 transition duration-300">
                <div class="text-4xl md:text-5xl font-extrabold mb-2 text-blue-400">98%</div>
                <div class="text-gray-300 text-xs font-bold uppercase tracking-widest">Clientes Satisfeitos</div>
              </div>
              <div class="p-4 border-l border-gray-800 transform hover:scale-105 transition duration-300">
                <div class="text-4xl md:text-5xl font-extrabold mb-2 text-blue-400">24/7</div>
                <div class="text-gray-300 text-xs font-bold uppercase tracking-widest">Suporte Dedicado</div>
              </div>
            </div>
          </section>
        `
    });

    bm.add('team-section', {
        label: 'Equipe',
        category: 'Institucional',
        attributes: { class: 'fas fa-users' },
        content: `
          <section class="py-20 bg-white font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div class="text-center mb-16">
                <h2 class="text-3xl font-bold text-gray-900 mb-4">Conheça o Time</h2>
                <p class="text-gray-500 max-w-2xl mx-auto">Especialistas apaixonados dedicados ao sucesso do seu projeto.</p>
              </div>
              <div class="grid md:grid-cols-4 gap-8">
                <!-- Member 1 -->
                <div class="text-center group">
                  <div class="relative mb-6 inline-block">
                    <div class="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition"></div>
                    <img src="https://placehold.co/150x150" class="relative w-32 h-32 rounded-full object-cover mx-auto grayscale group-hover:grayscale-0 transition duration-500 border-4 border-white shadow-lg">
                    <div class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition duration-300"><i class="fab fa-linkedin-in text-xs"></i></div>
                  </div>
                  <h3 class="font-bold text-lg text-gray-900">Ana Silva</h3>
                  <p class="text-blue-600 text-xs font-bold uppercase tracking-wide mt-1">CEO & Founder</p>
                </div>
                <!-- Member 2 -->
                <div class="text-center group">
                  <div class="relative mb-6 inline-block">
                    <div class="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition"></div>
                    <img src="https://placehold.co/150x150" class="relative w-32 h-32 rounded-full object-cover mx-auto grayscale group-hover:grayscale-0 transition duration-500 border-4 border-white shadow-lg">
                    <div class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition duration-300"><i class="fab fa-linkedin-in text-xs"></i></div>
                  </div>
                  <h3 class="font-bold text-lg text-gray-900">Carlos Souza</h3>
                  <p class="text-blue-600 text-xs font-bold uppercase tracking-wide mt-1">Diretor de Ops</p>
                </div>
                <!-- Member 3 -->
                <div class="text-center group">
                  <div class="relative mb-6 inline-block">
                    <div class="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition"></div>
                    <img src="https://placehold.co/150x150" class="relative w-32 h-32 rounded-full object-cover mx-auto grayscale group-hover:grayscale-0 transition duration-500 border-4 border-white shadow-lg">
                    <div class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition duration-300"><i class="fab fa-linkedin-in text-xs"></i></div>
                  </div>
                  <h3 class="font-bold text-lg text-gray-900">Mariana Lima</h3>
                  <p class="text-blue-600 text-xs font-bold uppercase tracking-wide mt-1">Head de Design</p>
                </div>
                <!-- Member 4 -->
                <div class="text-center group">
                  <div class="relative mb-6 inline-block">
                    <div class="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition"></div>
                    <img src="https://placehold.co/150x150" class="relative w-32 h-32 rounded-full object-cover mx-auto grayscale group-hover:grayscale-0 transition duration-500 border-4 border-white shadow-lg">
                    <div class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition duration-300"><i class="fab fa-linkedin-in text-xs"></i></div>
                  </div>
                  <h3 class="font-bold text-lg text-gray-900">Pedro Santos</h3>
                  <p class="text-blue-600 text-xs font-bold uppercase tracking-wide mt-1">Lead Developer</p>
                </div>
              </div>
            </div>
          </section>
        `
    });

    bm.add('contact-section', {
        label: 'Contato e Mapa',
        category: 'Institucional',
        attributes: { class: 'fas fa-map-marked-alt' },
        content: `
          <section class="py-20 bg-white font-sans" id="contato">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-16">
              <div>
                <span class="text-blue-600 font-bold tracking-wider text-xs uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Fale Conosco</span>
                <h2 class="text-3xl font-bold text-gray-900 mt-4 mb-6">Estamos prontos para atender</h2>
                <p class="text-gray-600 mb-8 leading-relaxed">Tem alguma dúvida ou projeto em mente? Entre em contato pelos canais abaixo ou preencha o formulário.</p>
                
                <div class="space-y-6">
                  <div class="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100 group">
                    <div class="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition"><i class="fas fa-map-marker-alt text-lg"></i></div>
                    <div>
                      <h4 class="font-bold text-gray-900 text-base">Endereço</h4>
                      <p class="text-gray-600 text-sm mt-1">Av. Paulista, 1000 - Bela Vista<br>São Paulo, SP - 01310-100</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100 group">
                    <div class="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition"><i class="fas fa-phone text-lg"></i></div>
                    <div>
                      <h4 class="font-bold text-gray-900 text-base">Telefone / WhatsApp</h4>
                      <p class="text-gray-600 text-sm mt-1">+55 (11) 99999-9999</p>
                      <p class="text-gray-500 text-xs mt-1">Seg-Sex, 9h às 18h</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100 group">
                    <div class="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition"><i class="fas fa-envelope text-lg"></i></div>
                    <div>
                      <h4 class="font-bold text-gray-900 text-base">E-mail</h4>
                      <p class="text-gray-600 text-sm mt-1">contato@suaempresa.com.br</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-gray-50 p-8 rounded-2xl border border-gray-200 shadow-sm">
                <form class="space-y-5">
                  <h3 class="font-bold text-xl text-gray-900 mb-6">Envie uma mensagem</h3>
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome</label>
                    <input type="text" placeholder="João Silva" class="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition bg-white text-sm">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Seu E-mail</label>
                    <input type="email" placeholder="joao@email.com" class="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition bg-white text-sm">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                    <textarea rows="4" placeholder="Olá, gostaria de um orçamento..." class="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition bg-white text-sm resize-none"></textarea>
                  </div>
                  <button type="button" class="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5 text-sm uppercase tracking-wide">
                    Enviar Mensagem
                  </button>
                </form>
              </div>
            </div>
          </section>
        `
    });

    bm.add('partners-logo', {
        label: 'Logos Parceiros',
        category: 'Institucional',
        attributes: { class: 'far fa-handshake' },
        content: `
          <div class="py-12 bg-white border-t border-b border-gray-100 font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p class="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Empresas que confiam em nosso trabalho</p>
                <div class="flex flex-wrap justify-center items-center gap-12 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    <img src="https://placehold.co/120x40?text=LOGO+1" class="h-8 md:h-10 object-contain hover:scale-110 transition cursor-pointer">
                    <img src="https://placehold.co/120x40?text=LOGO+2" class="h-8 md:h-10 object-contain hover:scale-110 transition cursor-pointer">
                    <img src="https://placehold.co/120x40?text=LOGO+3" class="h-8 md:h-10 object-contain hover:scale-110 transition cursor-pointer">
                    <img src="https://placehold.co/120x40?text=LOGO+4" class="h-8 md:h-10 object-contain hover:scale-110 transition cursor-pointer">
                    <img src="https://placehold.co/120x40?text=LOGO+5" class="h-8 md:h-10 object-contain hover:scale-110 transition cursor-pointer">
                </div>
            </div>
          </div>
        `
    });

    // =========================================
    // CATEGORIA: CONVERSÃO (NOVOS E MELHORADOS)
    // =========================================

    bm.add('vsl-section', {
        label: 'Vídeo VSL',
        category: 'Conversão',
        attributes: { class: 'fas fa-play-circle' },
        content: `
          <section class="py-20 bg-gray-900 text-center font-sans">
            <div class="max-w-4xl mx-auto px-4 sm:px-6">
                <h2 class="text-3xl md:text-4xl font-extrabold text-white mb-8 leading-tight">Veja como funciona na prática</h2>
                <div class="relative aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-gray-800 group cursor-pointer">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                    <!-- Placeholder Image for Video -->
                    <img src="https://placehold.co/1280x720/111/333?text=Video+Thumbnail" class="w-full h-full object-cover opacity-80" alt="Video Thumb">
                    
                    <div class="absolute inset-0 flex items-center justify-center z-20">
                        <div class="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center pl-2 shadow-lg shadow-red-900/50 group-hover:scale-110 group-hover:bg-red-500 transition transform duration-300">
                            <i class="fas fa-play text-white text-3xl"></i>
                        </div>
                    </div>
                    <p class="absolute bottom-6 left-0 right-0 text-gray-300 text-sm font-medium z-20">Clique para assistir (2 min)</p>
                </div>
                <div class="mt-10">
                    <button class="bg-green-500 hover:bg-green-600 text-white font-extrabold py-4 px-10 rounded-full text-lg shadow-xl shadow-green-500/20 transition transform hover:-translate-y-1 animate-pulse">
                        QUERO ESSA SOLUÇÃO
                    </button>
                    <p class="mt-4 text-xs text-gray-500 uppercase tracking-wide">Acesso Imediato • Garantia de 7 Dias</p>
                </div>
            </div>
          </section>
        `
    });

    bm.add('cta-banner', {
        label: 'Banner CTA',
        category: 'Conversão',
        attributes: { class: 'fas fa-bullhorn' },
        content: `
          <section class="py-12 bg-blue-600 font-sans">
            <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div>
                    <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Pronto para transformar seu negócio?</h2>
                    <p class="text-blue-100 text-lg">Junte-se a mais de 500 empresas que já cresceram conosco.</p>
                </div>
                <button class="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105 whitespace-nowrap">
                    Começar Agora
                </button>
            </div>
          </section>
        `
    });

    bm.add('process-steps', {
        label: 'Passo a Passo',
        category: 'Conversão',
        attributes: { class: 'fas fa-list-ol' },
        content: `
          <section class="py-20 bg-white font-sans">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">Como Funciona?</h2>
                    <p class="text-gray-500">É simples, rápido e prático.</p>
                </div>
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Step 1 -->
                    <div class="relative flex flex-col items-center text-center p-6">
                        <div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-blue-200 z-10 relative">1</div>
                        <!-- Connector Line -->
                        <div class="hidden md:block absolute top-14 left-1/2 w-full h-1 bg-gray-100 -z-0"></div>
                        
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Cadastro</h3>
                        <p class="text-gray-600 text-sm leading-relaxed">Crie sua conta gratuita em menos de 1 minuto. Sem necessidade de cartão de crédito.</p>
                    </div>
                    <!-- Step 2 -->
                    <div class="relative flex flex-col items-center text-center p-6">
                        <div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-blue-200 z-10 relative">2</div>
                        <!-- Connector Line -->
                        <div class="hidden md:block absolute top-14 left-1/2 w-full h-1 bg-gray-100 -z-0"></div>

                        <h3 class="text-xl font-bold text-gray-900 mb-3">Configuração</h3>
                        <p class="text-gray-600 text-sm leading-relaxed">Personalize a ferramenta de acordo com as necessidades do seu negócio com poucos cliques.</p>
                    </div>
                    <!-- Step 3 -->
                    <div class="relative flex flex-col items-center text-center p-6">
                        <div class="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-green-200 z-10 relative">3</div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Resultados</h3>
                        <p class="text-gray-600 text-sm leading-relaxed">Acompanhe o crescimento e comece a colher os frutos da automação inteligente.</p>
                    </div>
                </div>
            </div>
          </section>
        `
    });

    bm.add('features-split-right', {
        label: 'Feature (Img Dir)',
        category: 'Conversão',
        attributes: { class: 'fas fa-columns' },
        content: `
          <section class="py-20 bg-white font-sans overflow-hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                    <div class="mb-12 lg:mb-0">
                        <h2 class="text-3xl font-extrabold text-gray-900 mb-6">
                            Controle total sobre <br><span class="text-blue-600">seus dados</span>.
                        </h2>
                        <p class="text-lg text-gray-600 mb-8 leading-relaxed">
                            Chega de planilhas confusas. Nossa dashboard intuitiva permite que você visualize todas as métricas importantes em tempo real, facilitando a tomada de decisão.
                        </p>
                        <ul class="space-y-4">
                            <li class="flex items-center text-gray-700 font-medium"><i class="fas fa-check-circle text-green-500 mr-3 text-lg"></i> Relatórios em Tempo Real</li>
                            <li class="flex items-center text-gray-700 font-medium"><i class="fas fa-check-circle text-green-500 mr-3 text-lg"></i> Exportação de Dados (CSV/PDF)</li>
                            <li class="flex items-center text-gray-700 font-medium"><i class="fas fa-check-circle text-green-500 mr-3 text-lg"></i> Integração via API</li>
                        </ul>
                    </div>
                    <div class="relative">
                        <div class="absolute -inset-4 bg-gradient-to-r from-blue-100 to-gray-100 rounded-xl transform rotate-2"></div>
                        <img src="https://placehold.co/600x400/EEE/31343C?text=Dashboard+UI" class="relative rounded-lg shadow-2xl w-full object-cover transform transition hover:-rotate-1" alt="Feature">
                    </div>
                </div>
            </div>
          </section>
        `
    });

    bm.add('features-split-left', {
        label: 'Feature (Img Esq)',
        category: 'Conversão',
        attributes: { class: 'fas fa-columns' },
        content: `
          <section class="py-20 bg-gray-50 font-sans overflow-hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                    <div class="relative order-2 lg:order-1 mb-12 lg:mb-0">
                        <div class="absolute -inset-4 bg-gradient-to-l from-purple-100 to-blue-50 rounded-xl transform -rotate-2"></div>
                        <img src="https://placehold.co/600x400/EEE/31343C?text=Mobile+App" class="relative rounded-lg shadow-2xl w-full object-cover transform transition hover:rotate-1" alt="Feature">
                    </div>
                    <div class="order-1 lg:order-2">
                        <h2 class="text-3xl font-extrabold text-gray-900 mb-6">
                            Acesse de onde estiver, <br><span class="text-purple-600">quando quiser</span>.
                        </h2>
                        <p class="text-lg text-gray-600 mb-8 leading-relaxed">
                            Nossa plataforma é 100% responsiva e baseada na nuvem. Seja no escritório, em casa ou em viagem, seu negócio continua rodando na palma da sua mão.
                        </p>
                        <ul class="space-y-4">
                            <li class="flex items-center text-gray-700 font-medium"><i class="fas fa-mobile-alt text-purple-500 mr-3 text-lg"></i> App Nativo (iOS e Android)</li>
                            <li class="flex items-center text-gray-700 font-medium"><i class="fas fa-wifi text-purple-500 mr-3 text-lg"></i> Modo Offline Inteligente</li>
                            <li class="flex items-center text-gray-700 font-medium"><i class="fas fa-lock text-purple-500 mr-3 text-lg"></i> Segurança de Ponta a Ponta</li>
                        </ul>
                    </div>
                </div>
            </div>
          </section>
        `
    });

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
                    <div class="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                        <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                            <i class="fas fa-clock"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Economia de Tempo</h3>
                        <p class="text-gray-600 leading-relaxed">Automatize tarefas repetitivas e ganhe horas livres no seu dia para focar no que importa.</p>
                    </div>
                    <!-- Item 2 -->
                    <div class="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Resultados Comprovados</h3>
                        <p class="text-gray-600 leading-relaxed">Metodologia validada por milhares de clientes que já atingiram seus objetivos.</p>
                    </div>
                    <!-- Item 3 -->
                    <div class="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
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
          <div class="bg-red-600 text-white p-4 text-center shadow-md font-sans">
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

    // =========================================
    // CATEGORIA: ESTRUTURA (EXISTENTES)
    // =========================================

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

    // =========================================
    // CATEGORIA: BÁSICO
    // =========================================

    bm.add('text-block', {
        label: 'Texto',
        category: 'Básico',
        content: '<div class="p-4 text-gray-600 font-sans"><p>Insira seu texto aqui...</p></div>'
    });
    
    bm.add('image-block', {
        label: 'Imagem',
        category: 'Básico',
        content: '<img src="https://via.placeholder.com/600x400" class="w-full h-auto rounded-lg shadow-md" />'
    });
};
