

export const CURRICULUM_TEMPLATES = {
    minimalist: `
    <div class="bg-white p-8 max-w-3xl mx-auto font-sans text-gray-800 shadow-lg rounded-lg my-8">
        <div class="resume-header">
            <h1 id="personal-info-name"></h1>
            <p><span id="personal-info-email"></span> | <span id="personal-info-phone"></span> | <a id="personal-info-linkedin" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | <a id="personal-info-portfolio" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a></p>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Resumo Profissional</h2>
            <div id="summary-content"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Experiência Profissional</h2>
            <div id="experience-list"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Formação Acadêmica</h2>
            <div id="education-list"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Habilidades</h2>
            <div id="skills-list" class="skill-list"></div>
        </div>

        <div id="projects-section" class="resume-section">
            <h2 class="section-title">Projetos</h2>
            <div id="projects-list"></div>
        </div>

        <div id="certifications-section" class="resume-section">
            <h2 class="section-title">Certificações e Prêmios</h2>
            <ul id="certifications-list" class="list-disc ml-6"></ul>
        </div>
    </div>
    `,
    professional: `
    <div class="bg-white p-10 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8 border-t-4 border-blue-700">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-extrabold text-blue-700" id="personal-info-name-prof"></h1>
            <p class="text-gray-600 text-sm mt-2">
                <span id="personal-info-email-prof"></span> | <span id="personal-info-phone-prof"></span> | 
                <a id="personal-info-linkedin-prof" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | 
                <a id="personal-info-portfolio-prof" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Resumo Profissional</h2></div>
            <p class="text-gray-700 leading-relaxed" id="summary-content-prof"></p>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Experiência Profissional</h2></div>
            <div id="experience-list-prof"></div>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Formação Acadêmica</h2></div>
            <div id="education-list-prof"></div>
        </div>

        <div class="resume-section">
            <div class="section-header-prof"><h2>Habilidades</h2></div>
            <div id="skills-list-prof" class="skill-list"></div>
        </div>

        <div id="projects-section-prof" class="resume-section">
            <div class="section-header-prof"><h2>Projetos</h2></div>
            <div id="projects-list-prof"></div>
        </div>

        <div id="certifications-section-prof" class="resume-section">
            <div class="section-header-prof"><h2>Certificações</h2></div>
            <ul id="certifications-list-prof" class="list-disc ml-6 text-gray-700"></ul>
        </div>
    </div>
    `,
    modern: `
    <div class="bg-gray-100 p-8 max-w-3xl mx-auto font-sans text-gray-800 rounded-lg shadow-2xl my-8">
        <div class="bg-white p-8 rounded-lg shadow-md mb-8">
            <h1 class="text-5xl font-extrabold text-center text-blue-700 mb-2" id="personal-info-name-modern"></h1>
            <p class="text-center text-gray-600 text-lg" id="summary-tagline-modern"></p>
        </div>

        <div class="resume-grid-modern">
            <div class="sidebar-modern">
                <div class="mb-8">
                    <h2 class="section-title-sidebar-modern">Contato</h2>
                    <div class="text-sm">
                        <p class="personal-info-item-modern"><i class="fas fa-envelope"></i> <a id="personal-info-email-modern" href="#"></a></p>
                        <p class="personal-info-item-modern"><i class="fas fa-phone"></i> <span id="personal-info-phone-modern"></span></p>
                        <p class="personal-info-item-modern"><i class="fab fa-linkedin"></i> <a id="personal-info-linkedin-modern" href="#" target="_blank">LinkedIn</a></p>
                        <p id="portfolio-item-modern" class="personal-info-item-modern"><i class="fas fa-globe"></i> <a id="personal-info-portfolio-modern" href="#" target="_blank">Portfólio</a></p>
                    </div>
                </div>

                <div class="mb-8">
                    <h2 class="section-title-sidebar-modern">Habilidades</h2>
                    <div id="skills-list-modern"></div>
                </div>

                <div id="certifications-section-modern">
                    <h2 class="section-title-sidebar-modern">Certificações</h2>
                    <ul id="certifications-list-modern" class="list-none text-sm text-gray-300"></ul>
                </div>
            </div>

            <div class="main-content">
                <div class="mb-8">
                    <h2 class="section-title-main-modern">Resumo Profissional</h2>
                    <div id="summary-content-modern" class="text-gray-700 leading-relaxed"></div>
                </div>
                <div class="mb-8">
                    <h2 class="section-title-main-modern">Experiência</h2>
                    <div id="experience-list-modern"></div>
                </div>

                <div>
                    <h2 class="section-title-main-modern">Educação</h2>
                    <div id="education-list-modern"></div>
                </div>

                <div id="projects-section-modern" class="mb-8">
                    <h2 class="section-title-main-modern">Projetos</h2>
                    <div id="projects-list-modern"></div>
                </div>
            </div>
        </div>
    </div>
    `,
    creative: `
    <div class="bg-gradient-to-br from-purple-100 to-blue-100 p-8 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8">
        <div class="resume-header-creative-base">
            <h1 id="personal-info-name-creative"></h1>
            <p>
                <span id="personal-info-email-creative"></span> | <span id="personal-info-phone-creative"></span> | 
                <a id="personal-info-linkedin-creative" href="#" target="_blank" class="text-purple-600 hover:underline">LinkedIn</a> | 
                <a id="personal-info-portfolio-creative" href="#" target="_blank" class="text-purple-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Resumo</h2>
            <p class="text-gray-700 leading-relaxed text-center" id="summary-content-creative"></p>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Experiência</h2>
            <div id="experience-list-creative"></div>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Educação</h2>
            <div id="education-list-creative"></div>
        </div>

        <div class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Habilidades</h2>
            <div id="skills-list-creative" class="skill-list-creative-base"></div>
        </div>

        <div id="projects-section-creative" class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Projetos</h2>
            <div id="projects-list-creative"></div>
        </div>

        <div id="certifications-section-creative" class="resume-section-creative-base">
            <h2 class="section-title-creative-base">Certificações</h2>
            <ul id="certifications-list-creative" class="description-creative-base text-gray-700"></ul>
        </div>
    </div>
    `,
    tech: `
    <div class="bg-gray-900 p-8 max-w-3xl mx-auto font-mono text-gray-200 shadow-xl rounded-lg my-8 border-t-4 border-green-500">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-green-500 mb-2" id="personal-info-name-tech"></h1>
            <div class="personal-info-tech text-gray-400 text-sm">
                <p><span id="personal-info-email-tech"></span> | <span id="personal-info-phone-tech"></span></p>
                <p><a id="personal-info-linkedin-tech" href="#" target="_blank">LinkedIn</a> | <a id="personal-info-portfolio-tech" href="#" target="_blank">Portfólio</a></p>
            </div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Resumo</h2>
            <p class="text-gray-300 leading-relaxed" id="summary-content-tech"></p>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Experiência</h2>
            <div id="experience-list-tech"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Habilidades</h2>
            <div id="skills-list-tech" class="skill-list-tech"></div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Educação</h2>
            <div id="education-list-tech"></div>
        </div>

        <div id="projects-section-tech" class="resume-section">
            <h2 class="section-title-tech">Projetos</h2>
            <div id="projects-list-tech"></div>
        </div>

        <div id="certifications-section-tech" class="resume-section">
            <h2 class="section-title-tech">Certificações</h2>
            <ul id="certifications-list-tech" class="job-description-tech text-gray-300"></ul>
        </div>
    </div>
    `,
    compact: `
    <div class="bg-white p-6 max-w-2xl mx-auto font-sans text-gray-800 shadow-md rounded-lg my-8 border-l-4 border-gray-600">
        <div class="resume-header-compact">
            <h1 id="personal-info-name-compact"></h1>
            <p>
                <span id="personal-info-email-compact"></span> | <span id="personal-info-phone-compact"></span> | 
                <a id="personal-info-linkedin-compact" href="#" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | 
                <a id="personal-info-portfolio-compact" href="#" target="_blank" class="text-blue-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Resumo</h2>
            <p id="summary-content-compact"></p>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Experiência</h2>
            <div id="experience-list-compact"></div>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Educação</h2>
            <div id="education-list-compact"></div>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Habilidades</h2>
            <div id="skills-list-compact" class="skill-list-compact text-gray-700"></div>
        </div>

        <div id="projects-section-compact" class="mb-4">
            <h2 class="section-title-compact">Projetos</h2>
            <div id="projects-list-compact"></div>
        </div>

        <div id="certifications-section-compact" class="mb-4">
            <h2 class="section-title-compact">Certificações</h2>
            <ul id="certifications-list-compact" class="item-description-compact text-gray-700"></ul>
        </div>
    </div>
    `,
    creative_sidebar: `
    <div class="bg-white max-w-3xl mx-auto font-sans text-gray-800 shadow-xl rounded-lg my-8 flex">
        <div class="sidebar-creative-split">
            <div class="photo-frame-creative">
                <img src="https://via.placeholder.com/120x120?text=Sua+Foto" alt="Sua Foto de Perfil">
            </div>
            <h1 class="name-creative-split" id="personal-info-name-creative-sidebar"></h1>
            <p class="title-creative-split" id="personal-info-title-creative-sidebar"></p>

            <div class="mb-6">
                <div class="contact-item-creative"><i class="fas fa-envelope"></i> <a id="personal-info-email-creative-sidebar" href="#"></a></div>
                <div class="contact-item-creative"><i class="fas fa-phone"></i> <span id="personal-info-phone-creative-sidebar"></span></div>
                <div class="contact-item-creative"><i class="fab fa-linkedin"></i> <a id="personal-info-linkedin-creative-sidebar" href="#" target="_blank">LinkedIn</a></div>
                <div id="portfolio-item-creative-sidebar" class="contact-item-creative"><i class="fas fa-globe"></i> <a id="personal-info-portfolio-creative-sidebar" href="#" target="_blank">Portfólio</a></div>
            </div>

            <h2 class="section-title-sidebar-creative-split">Habilidades</h2>
            <div id="skills-list-creative-sidebar" class="text-sm"></div>

            <div id="certifications-section-creative-sidebar">
                <h2 class="section-title-sidebar-creative-split">Certificações</h2>
                <ul id="certifications-list-creative-sidebar" class="list-none text-sm text-gray-800 mt-2"></ul>
            </div>
        </div>

        <div class="main-content-creative-split">
            <div class="mb-8">
                <h2 class="main-section-title-creative-split">Resumo Profissional</h2>
                <p class="text-gray-700 leading-relaxed" id="summary-content-creative-sidebar"></p>
            </div>

            <div class="mb-8">
                <h2 class="main-section-title-creative-split">Experiência</h2>
                <div id="experience-list-creative-sidebar"></div>
            </div>

            <div class="mb-8">
                <h2 class="main-section-title-creative-split">Educação</h2>
                <div id="education-list-creative-sidebar"></div>
            </div>

            <div id="projects-section-creative-sidebar" class="mb-8">
                <h2 class="main-section-title-creative-split">Projetos</h2>
                <div id="projects-list-creative-sidebar"></div>
            </div>
        </div>
    </div>
    `
};
