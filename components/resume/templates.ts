export const CURRICULUM_TEMPLATES = {
    modern_standard: `
    <div class="bg-white p-12 max-w-4xl mx-auto font-sans text-gray-900 shadow-2xl my-8 leading-relaxed">
        <!-- Header Estilo Executivo -->
        <div class="text-left border-b-4 border-gray-800 pb-8 mb-8">
            <div class="flex justify-between items-baseline">
                <h1 class="text-5xl font-black tracking-tighter uppercase text-gray-900" id="personal-info-name"></h1>
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest" id="personal-info-title">Profissional</span>
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm font-semibold text-gray-600">
                <div class="flex items-center gap-2"><i class="fas fa-map-marker-alt text-blue-600"></i> <span id="personal-info-location"></span></div>
                <div class="flex items-center gap-2"><i class="fas fa-envelope text-blue-600"></i> <span id="personal-info-email"></span></div>
                <div class="flex items-center gap-2"><i class="fas fa-phone text-blue-600"></i> <span id="personal-info-phone"></span></div>
                <div class="flex items-center gap-2"><i class="fab fa-linkedin text-blue-600"></i> <span id="personal-info-linkedin"></span></div>
            </div>
        </div>

        <!-- Seção: Perfil -->
        <div class="mb-12">
            <h2 class="text-sm font-black uppercase tracking-[0.3em] text-blue-700 mb-4 flex items-center gap-3">
                PERFIL PROFISSIONAL
                <span class="h-px bg-gray-200 flex-grow"></span>
            </h2>
            <div id="summary-content" class="text-base text-gray-700 leading-relaxed font-medium"></div>
        </div>

        <!-- Seção: Experiência -->
        <div class="mb-12">
            <h2 class="text-sm font-black uppercase tracking-[0.3em] text-blue-700 mb-6 flex items-center gap-3">
                TRAJETÓRIA DE IMPACTO
                <span class="h-px bg-gray-200 flex-grow"></span>
            </h2>
            <div id="experience-list" class="space-y-10"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
            <!-- Seção: Educação -->
            <div>
                <h2 class="text-sm font-black uppercase tracking-[0.3em] text-blue-700 mb-6 flex items-center gap-3">
                    FORMAÇÃO
                    <span class="h-px bg-gray-200 flex-grow"></span>
                </h2>
                <div id="education-list" class="space-y-6"></div>
            </div>

            <!-- Seção: Habilidades -->
            <div>
                <h2 class="text-sm font-black uppercase tracking-[0.3em] text-blue-700 mb-6 flex items-center gap-3">
                    COMPETÊNCIAS
                    <span class="h-px bg-gray-200 flex-grow"></span>
                </h2>
                <div id="skills-list" class="flex flex-wrap gap-2"></div>
            </div>
        </div>

        <div class="mt-16 pt-8 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
            Optimized for ATS & AI Recruitment Systems
        </div>
    </div>
    `,
    professional_clean: `
    <div class="bg-white p-12 max-w-3xl mx-auto font-serif text-slate-900 shadow-2xl my-8">
        <div class="text-center mb-10">
            <h1 class="text-4xl font-bold mb-3" id="personal-info-name"></h1>
            <p class="text-sm italic text-slate-600">
                <span id="personal-info-location"></span> | <span id="personal-info-email"></span> | <span id="personal-info-phone"></span>
            </p>
        </div>

        <div class="mb-8">
            <h2 class="border-b border-slate-300 font-bold uppercase text-xs tracking-widest pb-1 mb-4">Sumário Executivo</h2>
            <div id="summary-content" class="text-sm leading-relaxed"></div>
        </div>

        <div class="mb-8">
            <h2 class="border-b border-slate-300 font-bold uppercase text-xs tracking-widest pb-1 mb-4">Trajetória Profissional</h2>
            <div id="experience-list" class="space-y-6"></div>
        </div>

        <div class="mb-8">
            <h2 class="border-b border-slate-300 font-bold uppercase text-xs tracking-widest pb-1 mb-4">Formação Acadêmica</h2>
            <div id="education-list" class="space-y-4"></div>
        </div>

        <div>
            <h2 class="border-b border-slate-300 font-bold uppercase text-xs tracking-widest pb-1 mb-4">Especialidades Técnicas</h2>
            <div id="skills-list" class="text-sm italic"></div>
        </div>
    </div>
    `,
    creative_sidebar: `
    <div class="max-w-4xl mx-auto my-8 bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[1000px]">
        <div class="w-full md:w-72 bg-slate-900 text-slate-300 p-8 flex flex-col">
            <div class="mb-10">
                <h1 class="text-2xl font-bold text-white mb-2" id="personal-info-name"></h1>
                <p class="text-blue-400 text-xs font-black uppercase tracking-widest" id="personal-info-title"></p>
            </div>

            <div class="space-y-6 flex-grow">
                <div>
                    <h3 class="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4">Contato</h3>
                    <ul class="text-xs space-y-3 opacity-80">
                        <li id="personal-info-location"></li>
                        <li id="personal-info-email"></li>
                        <li id="personal-info-phone"></li>
                    </ul>
                </div>
                
                <div>
                    <h3 class="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4">Expertise</h3>
                    <div id="skills-list" class="flex flex-wrap gap-2"></div>
                </div>
            </div>

            <div class="mt-auto pt-10 text-[9px] opacity-40 uppercase tracking-widest">
                Gerado via GDN_IA Elite
            </div>
        </div>

        <div class="flex-1 p-12 bg-slate-50">
            <section class="mb-12">
                <h2 class="text-slate-900 font-bold text-xl mb-4 flex items-center gap-2">
                    <span class="w-6 h-1 bg-blue-600 rounded-full"></span> Sobre Mim
                </h2>
                <div id="summary-content" class="text-slate-600 leading-relaxed text-sm"></div>
            </section>

            <section>
                <h2 class="text-slate-900 font-bold text-xl mb-6 flex items-center gap-2">
                    <span class="w-6 h-1 bg-blue-600 rounded-full"></span> Experiência de Impacto
                </h2>
                <div id="experience-list" class="space-y-8"></div>
            </section>
        </div>
    </div>
    `
};