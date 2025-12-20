export const CURRICULUM_TEMPLATES = {
    modern_standard: `
    <div class="bg-white p-12 max-w-3xl mx-auto font-sans text-slate-800 shadow-xl rounded-lg my-8 leading-relaxed">
        <div class="border-b-2 border-slate-900 pb-6 mb-8">
            <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 uppercase mb-2" id="personal-info-name"></h1>
            <div class="text-sm font-medium text-slate-500 flex flex-wrap gap-x-4">
                <span id="personal-info-location"></span>
                <span id="personal-info-email"></span>
                <span id="personal-info-phone"></span>
                <a id="personal-info-linkedin" class="text-blue-700 font-bold">LinkedIn</a>
            </div>
        </div>

        <div class="mb-8">
            <h2 class="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Perfil Profissional</h2>
            <div id="summary-content" class="text-slate-700"></div>
        </div>

        <div class="mb-8">
            <h2 class="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Experiência Profissional</h2>
            <div id="experience-list" class="space-y-6"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h2 class="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Educação</h2>
                <div id="education-list" class="space-y-4"></div>
            </div>
            <div>
                <h2 class="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Habilidades & Tecnologias</h2>
                <div id="skills-list" class="flex flex-wrap gap-2"></div>
            </div>
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