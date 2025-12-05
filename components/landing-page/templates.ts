

export const TEMPLATES = {
  saas_dark: `
    <header class="bg-gray-900 text-white p-6 flex justify-between items-center border-b border-gray-800">
      <div class="font-bold text-xl tracking-wider">SaaS<span class="text-blue-500">Pro</span></div>
      <div class="hidden md:flex items-center">
        <!-- Links de navegação removidos para foco total na conversão -->
        <a href="#contact" class="bg-blue-600 px-5 py-2 rounded-lg hover:bg-blue-500 transition font-bold shadow-lg shadow-blue-900/20">Começar Grátis</a>
      </div>
    </header>
    <section class="bg-gray-900 text-white py-32 text-center px-4 relative overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900 to-gray-900 pointer-events-none"></div>
      <div class="relative z-10 max-w-4xl mx-auto">
        <span class="inline-block py-1 px-3 rounded-full bg-blue-900/50 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-800">Nova Versão 2.0</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-8 leading-tight tracking-tight">Escale sua operação com <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Inteligência Real.</span></h1>
        <p class="text-gray-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">Automatize processos, aumente vendas e gerencie tudo em um só lugar. A plataforma que seus concorrentes gostariam de ter.</p>
        <div class="flex flex-col md:flex-row justify-center gap-4">
          <button class="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition shadow-xl shadow-blue-900/20 transform hover:-translate-y-1">Começar Teste Grátis</button>
          <button class="border border-gray-700 text-gray-300 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 hover:text-white transition">Agendar Demo</button>
        </div>
        <p class="mt-6 text-xs text-gray-500">Sem cartão de crédito necessário • Cancelamento a qualquer momento</p>
      </div>
    </section>
  `,
  ebook_sales: `
    <section class="bg-[#FFFBEB] min-h-screen flex items-center justify-center p-6 font-sans">
      <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div class="order-2 md:order-1">
          <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-yellow-200">Best-Seller</span>
          <h1 class="text-4xl md:text-6xl font-extrabold text-gray-900 mt-6 mb-6 leading-tight">Domine a Arte da Culinária Vegana <span class="text-yellow-600">em 30 Dias</span></h1>
          <p class="text-xl text-gray-700 mb-8 leading-relaxed">O guia definitivo com mais de 100 receitas, lista de compras semanal e planejamento nutricional completo para iniciantes.</p>
          
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100 mb-8">
            <ul class="space-y-3">
                <li class="flex items-center text-gray-700"><i class="fas fa-check-circle text-green-500 mr-3 text-xl"></i> +100 Receitas Testadas</li>
                <li class="flex items-center text-gray-700"><i class="fas fa-check-circle text-green-500 mr-3 text-xl"></i> Lista de Compras Econômica</li>
                <li class="flex items-center text-gray-700"><i class="fas fa-check-circle text-green-500 mr-3 text-xl"></i> Acesso Vitalício</li>
            </ul>
          </div>

          <div class="flex items-center gap-6 mb-8">
            <div>
                <p class="text-sm text-gray-500 line-through font-medium">De R$ 97,00</p>
                <p class="text-4xl font-bold text-green-700">Por R$ 29,90</p>
            </div>
            <div class="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold">-70% OFF</div>
          </div>

          <button class="w-full bg-green-600 text-white py-5 rounded-xl font-bold text-2xl hover:bg-green-700 transition shadow-xl shadow-green-200 transform hover:-translate-y-1">Quero Comprar Agora</button>
          <p class="text-xs text-center text-gray-500 mt-4 flex items-center justify-center gap-2"><i class="fas fa-lock"></i> Pagamento 100% Seguro • Satisfação Garantida</p>
        </div>
        
        <div class="relative order-1 md:order-2">
          <div class="absolute inset-0 bg-yellow-200 rounded-3xl rotate-6 transform opacity-50 blur-xl"></div>
          <img src="https://placehold.co/600x800/222/FFF?text=Capa+3D+Ebook" alt="Book Cover" class="relative rounded-2xl shadow-2xl w-full object-cover transform hover:scale-105 transition duration-500" />
        </div>
      </div>
    </section>
  `,
  webinar: `
    <section class="bg-indigo-950 text-white py-24 px-4 min-h-screen flex flex-col justify-center relative overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute top-0 right-0 w-1/2 h-full bg-indigo-900/30 skew-x-12"></div>
      <div class="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div class="max-w-4xl mx-auto relative z-10 text-center">
        <div class="inline-block bg-indigo-900/80 backdrop-blur-md border border-indigo-700 p-8 rounded-3xl shadow-2xl">
            <span class="text-indigo-300 font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Masterclass Exclusiva</span>
            <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight">Como Criar Funis de Venda Automáticos <br/><span class="text-purple-400">Sem Gastar com Anúncios</span></h1>
            <p class="text-indigo-200 text-lg mb-8 max-w-2xl mx-auto">Descubra o método secreto usado pelas maiores agências do país para faturar 7 dígitos no piloto automático.</p>
            
            <div class="flex items-center justify-center gap-4 mb-8 text-lg font-medium bg-white/5 inline-flex px-6 py-3 rounded-xl border border-white/10">
                <span class="flex items-center gap-2"><i class="far fa-calendar-alt text-purple-400"></i> 25 de Outubro</span>
                <span class="w-px h-6 bg-white/20"></span>
                <span class="flex items-center gap-2"><i class="far fa-clock text-purple-400"></i> 20:00h (Brasília)</span>
            </div>

            <form class="flex flex-col gap-4 max-w-md mx-auto">
            <div class="relative">
                <i class="fas fa-envelope absolute left-4 top-4 text-indigo-400"></i>
                <input type="email" placeholder="Seu melhor e-mail" class="w-full p-4 pl-12 rounded-xl bg-indigo-900/50 text-white border border-indigo-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none placeholder-indigo-400 transition" />
            </div>
            <button class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-purple-900/50 uppercase tracking-wide text-lg transform hover:-translate-y-1">Garantir Minha Vaga Grátis</button>
            </form>
            <p class="mt-4 text-xs text-indigo-400">🔒 Seus dados estão seguros. Não enviamos spam.</p>
        </div>
      </div>
    </section>
  `
};
