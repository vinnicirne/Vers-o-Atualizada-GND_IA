
import React, { useRef, useEffect, useState } from 'react';
import { Toast } from './admin/Toast';

interface LandingPageBuilderProps {
  initialHtml: string;
  onClose: () => void;
}

// --- TEMPLATES PRONTOS ---
const TEMPLATES = {
  saas_dark: `
    <header class="bg-gray-900 text-white p-6 flex justify-between items-center border-b border-gray-800">
      <div class="font-bold text-xl tracking-wider">SaaS<span class="text-blue-500">Pro</span></div>
      <div class="hidden md:flex space-x-6 text-sm items-center">
        <a href="#features" class="hover:text-blue-400 transition">Funcionalidades</a>
        <a href="#pricing" class="hover:text-blue-400 transition">Preços</a>
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

export function LandingPageBuilder({ initialHtml, onClose }: LandingPageBuilderProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [showTemplateModal, setShowTemplateModal] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inicialização do Editor
  useEffect(() => {
    let editorInstance: any = null;

    const initializeEditor = async () => {
      if (!editorContainerRef.current) return;

      // Se houver HTML inicial válido da IA (> 50 chars), não force o modal
      if (initialHtml && initialHtml.length > 50) {
          setShowTemplateModal(false);
      }

      try {
        // @ts-ignore
        const grapesjsModule = await import('grapesjs');
        const GrapesJS = grapesjsModule.default || grapesjsModule;

        editorInstance = GrapesJS.init({
          container: editorContainerRef.current,
          components: initialHtml || '<div class="p-10 text-center text-gray-400">Selecione um template ou comece do zero...</div>',
          height: '100%',
          width: '100%',
          panels: { defaults: [] }, // Custom UI handles panels
          storageManager: { type: 'local', autosave: false, autoload: false },
          plugins: [],
          deviceManager: {
            devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile', width: '375px', widthMedia: '480px' },
            ]
          },
          // Fix for text editing links
          richTextEditor: {
            actions: ['bold', 'italic', 'underline', 'strikethrough', 'link', 'unlink']
          }
        });

        editorInstance.on('load', () => {
          setEditor(editorInstance);
          setIsEditorReady(true);
          injectTailwind(editorInstance);
          addBlocks(editorInstance);
        });

      } catch (error) {
        console.error('Editor init failed:', error);
        setToast({ message: "Falha ao carregar editor.", type: 'error' });
      }
    };

    initializeEditor();

    return () => {
      if (editorInstance) editorInstance.destroy();
    };
  }, []); // Run once

  const injectTailwind = (ed: any) => {
      const frameEl = ed.Canvas.getFrameEl();
      const head = frameEl?.contentDocument?.head;
      if (head) {
          const script = document.createElement('script');
          script.src = "https://cdn.tailwindcss.com";
          head.appendChild(script);
          
          const style = document.createElement('style');
          style.innerHTML = `
            body { background-color: #ffffff; color: #1f2937; overflow-x: hidden; }
            a { cursor: pointer; }
            ::-webkit-scrollbar { width: 8px; background: #000; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
          `;
          head.appendChild(style);
      }
  };

  const addBlocks = (ed: any) => {
    const bm = ed.BlockManager;

    // --- CONVERSÃO ---
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

  // --- ACTIONS ---
  const handleDeviceChange = (device: string) => {
    if (!editor) return;
    setActiveDevice(device);
    const deviceMap: Record<string, string> = { 'Desktop': '', 'Tablet': 'Tablet', 'Mobile': 'Mobile' };
    editor.setDevice(deviceMap[device]);
  };

  const handleApplyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    if (!editor) return;
    const html = TEMPLATES[templateKey];
    if (html) {
      editor.setComponents(html);
      setShowTemplateModal(false);
      setToast({ message: "Template aplicado com sucesso!", type: 'success' });
    }
  };

  const handleAction = (action: string) => {
    if (!editor) return;
    switch(action) {
      case 'undo': editor.runCommand('core:undo'); break;
      case 'redo': editor.runCommand('core:redo'); break;
      case 'clear': 
        if(confirm('Tem certeza? Isso limpará todo o canvas.')) editor.runCommand('core:canvas-clear'); 
        break;
    }
  };

  const handleDownload = () => {
    if (editor) {
      const html = editor.getHtml();
      const css = editor.getCss();
      const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Landing Page</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>${css}</style></head><body class="bg-white font-sans">${html}</body></html>`;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `landing-page-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast({ message: "HTML exportado!", type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 animate-fade-in font-sans">
      
      {/* TOOLBAR SUPERIOR PRO */}
      <div className="h-16 bg-gray-950 border-b border-gray-800 flex justify-between items-center px-4 shadow-md z-20">
        
        {/* Esquerda: Título e Templates */}
        <div className="flex items-center gap-4">
            <span className="text-green-500 font-bold flex items-center gap-2">
                <i className="fas fa-layer-group"></i> <span className="hidden md:inline">Editor Visual Pro</span>
            </span>
            <div className="h-6 w-px bg-gray-800"></div>
            <button 
                onClick={() => setShowTemplateModal(true)}
                className="text-gray-400 hover:text-white text-xs font-bold flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition"
            >
                <i className="fas fa-th-large"></i> Templates
            </button>
        </div>

        {/* Centro: Dispositivos */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {['Desktop', 'Tablet', 'Mobile'].map(dev => (
                <button
                    key={dev}
                    onClick={() => handleDeviceChange(dev)}
                    className={`w-8 h-8 flex items-center justify-center rounded transition ${activeDevice === dev ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    title={`Visualizar em ${dev}`}
                >
                    <i className={`fas fa-${dev === 'Desktop' ? 'desktop' : dev === 'Tablet' ? 'tablet-alt' : 'mobile-alt'}`}></i>
                </button>
            ))}
        </div>

        {/* Direita: Ações */}
        <div className="flex items-center gap-3">
            <div className="flex gap-1 mr-2">
                <button onClick={() => handleAction('undo')} className="w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"><i className="fas fa-undo"></i></button>
                <button onClick={() => handleAction('redo')} className="w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"><i className="fas fa-redo"></i></button>
                <button onClick={() => handleAction('clear')} className="w-8 h-8 text-red-500 hover:bg-red-900/20 rounded transition ml-2" title="Limpar Tudo"><i className="fas fa-trash-alt"></i></button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-bold px-3">Sair</button>
            <button onClick={handleDownload} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 transition">
                <i className="fas fa-download"></i> Baixar
            </button>
        </div>
      </div>

      {/* EDITOR CANVAS */}
      <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
        {!isEditorReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-gray-500">
                <i className="fas fa-circle-notch fa-spin text-3xl mb-2 text-green-500"></i>
                <p>Carregando Editor...</p>
            </div>
        )}
        <div ref={editorContainerRef} className="h-full w-full" />
      </div>

      {/* TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Escolha um Template</h3>
                        <p className="text-sm text-gray-500">Comece com uma estrutura profissional de alta conversão.</p>
                    </div>
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto bg-gray-100 grid md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div onClick={() => handleApplyTemplate('saas_dark')} className="group cursor-pointer bg-gray-900 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-900/30 px-2 py-1 rounded">SaaS / Tech</span>
                            <h4 className="text-white font-bold text-lg mt-1">SaaS Dark Pro</h4>
                        </div>
                        <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Popular</div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-layer-group text-6xl text-gray-700 group-hover:text-blue-500 transition duration-500"></i>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div onClick={() => handleApplyTemplate('ebook_sales')} className="group cursor-pointer bg-amber-50 rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-500 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-amber-100 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-100 px-2 py-1 rounded">Infoproduto</span>
                            <h4 className="text-gray-900 font-bold text-lg mt-1">Venda de Ebook</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-book-open text-6xl text-amber-200 group-hover:text-amber-500 transition duration-500"></i>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div onClick={() => handleApplyTemplate('webinar')} className="group cursor-pointer bg-indigo-900 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-400 transition shadow-lg relative h-64">
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider bg-indigo-800/50 px-2 py-1 rounded">Captura de Lead</span>
                            <h4 className="text-white font-bold text-lg mt-1">Webinar / Aula</h4>
                        </div>
                        <div className="p-4 text-center mt-10">
                            <i className="fas fa-microphone text-6xl text-indigo-800 group-hover:text-indigo-400 transition duration-500"></i>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-500 hover:text-gray-800 font-bold text-sm">Continuar com meu conteúdo atual</button>
                </div>
            </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
