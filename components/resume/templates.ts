
export const CURRICULUM_TEMPLATES = {
    minimalist: `
    <div class="bg-white p-8 max-w-3xl mx-auto font-sans text-gray-800 shadow-lg rounded-lg my-8">
        <style>
            .resume-section { border-bottom: 1px solid #e0e0e0; padding-bottom: 1rem; margin-bottom: 1rem; }
            .resume-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
            .resume-header { text-align: center; margin-bottom: 2rem; }
            .resume-header h1 { font-size: 2.5rem; font-weight: 700; color: #2d3748; margin-bottom: 0.5rem; }
            .resume-header p { font-size: 0.9rem; color: #4a5568; }
            .section-title { font-size: 1.25rem; font-weight: 600; color: #2d3748; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
            .job-title { font-weight: 600; color: #333; margin-bottom: 0.25rem; }
            .company-info { font-style: italic; color: #555; margin-bottom: 0.5rem; }
            .job-description ul { list-style: disc; margin-left: 1.5rem; }
            .job-description li { margin-bottom: 0.5rem; }
            .skill-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
            .skill-item { background-color: #edf2f7; color: #2d3748; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; }
        </style>

        <div class="resume-header">
            <h1>{{personalInfo.name}}</h1>
            <p>{{personalInfo.email}} | {{personalInfo.phone}} | <a href="{{personalInfo.linkedin}}" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | <a href="{{personalInfo.portfolio}}" target="_blank" class="text-blue-600 hover:underline">Portfólio</a></p>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Resumo Profissional</h2>
            <p>{{summary}}</p>
        </div>

        <div class="resume-section">
            <h2 class="section-title">Experiência Profissional</h2>
            {{#each experience}}
            <div class="mb-4">
                <h3 class="job-title">{{this.title}}</h3>
                <p class="company-info">{{this.company}} | {{this.dates}}</p>
                <div class="job-description">
                    <p>{{this.description}}</p>
                </div>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <h2 class="section-title">Formação Acadêmica</h2>
            {{#each education}}
            <div class="mb-4">
                <h3 class="job-title">{{this.degree}}</h3>
                <p class="company-info">{{this.institution}} | {{this.dates}}</p>
                <p>{{this.description}}</p>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <h2 class="section-title">Habilidades</h2>
            <div class="skill-list">
                {{#each skills}}
                <span class="skill-item">{{this}}</span>
                {{/each}}
            </div>
        </div>

        {{#if projects}}
        <div class="resume-section">
            <h2 class="section-title">Projetos</h2>
            {{#each projects}}
            <div class="mb-4">
                <h3 class="job-title">{{this.name}}</h3>
                <p class="company-info">{{this.technologies}}</p>
                <p>{{this.description}}</p>
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if certifications}}
        <div class="resume-section">
            <h2 class="section-title">Certificações e Prêmios</h2>
            <ul class="list-disc ml-6">
                {{#each certifications}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </div>
        {{/if}}
    </div>
    `,
    professional: `
    <div class="bg-white p-10 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8 border-t-4 border-blue-700">
        <style>
            .resume-section { padding-top: 1.5rem; padding-bottom: 1.5rem; }
            .section-header { background-color: #f8f8f8; padding: 0.75rem 1.25rem; margin-left: -1.25rem; margin-right: -1.25rem; border-left: 5px solid #3b82f6; margin-bottom: 1.5rem; }
            .section-header h2 { font-size: 1.4rem; font-weight: 700; color: #1f2937; margin: 0; }
            .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
            .item-header h3 { font-size: 1.1rem; font-weight: 600; color: #2d3748; margin: 0; }
            .item-header span { font-size: 0.9rem; color: #4a5568; }
            .item-description ul { list-style: disc; margin-left: 1.5rem; }
            .item-description li { margin-bottom: 0.4rem; }
            .skill-category { font-weight: 600; color: #2d3748; margin-bottom: 0.5rem; }
            .skill-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
            .skill-item { background-color: #e0e7ff; color: #3b82f6; padding: 0.3rem 0.8rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; }
        </style>

        <div class="text-center mb-8">
            <h1 class="text-4xl font-extrabold text-blue-700">{{personalInfo.name}}</h1>
            <p class="text-gray-600 text-sm mt-2">
                {{personalInfo.email}} | {{personalInfo.phone}} | 
                <a href="{{personalInfo.linkedin}}" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | 
                <a href="{{personalInfo.portfolio}}" target="_blank" class="text-blue-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="resume-section">
            <div class="section-header"><h2>Resumo Profissional</h2></div>
            <p class="text-gray-700 leading-relaxed">{{summary}}</p>
        </div>

        <div class="resume-section">
            <div class="section-header"><h2>Experiência Profissional</h2></div>
            {{#each experience}}
            <div class="mb-6">
                <div class="item-header">
                    <h3>{{this.title}} - {{this.company}}</h3>
                    <span>{{this.dates}}</span>
                </div>
                <div class="item-description text-gray-700">
                    <p>{{this.description}}</p>
                </div>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <div class="section-header"><h2>Formação Acadêmica</h2></div>
            {{#each education}}
            <div class="mb-6">
                <div class="item-header">
                    <h3>{{this.degree}} - {{this.institution}}</h3>
                    <span>{{this.dates}}</span>
                </div>
                <p class="text-gray-700">{{this.description}}</p>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <div class="section-header"><h2>Habilidades</h2></div>
            <div class="skill-list">
                {{#each skills}}
                <span class="skill-item">{{this}}</span>
                {{/each}}
            </div>
        </div>

        {{#if projects}}
        <div class="resume-section">
            <div class="section-header"><h2>Projetos</h2></div>
            {{#each projects}}
            <div class="mb-6">
                <div class="item-header">
                    <h3>{{this.name}}</h3>
                    <span>{{this.technologies}}</span>
                </div>
                <p class="text-gray-700">{{this.description}}</p>
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if certifications}}
        <div class="resume-section">
            <div class="section-header"><h2>Certificações</h2></div>
            <ul class="list-disc ml-6 text-gray-700">
                {{#each certifications}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </div>
        {{/if}}
    </div>
    `,
    modern: `
    <div class="bg-gray-100 p-8 max-w-3xl mx-auto font-sans text-gray-800 rounded-lg shadow-2xl my-8">
        <style>
            .resume-grid { display: grid; grid-template-columns: 1fr 3fr; gap: 2rem; }
            .sidebar { background-color: #2d3748; color: #fff; padding: 2rem 1.5rem; border-radius: 8px; }
            .main-content { padding: 1.5rem 0; }
            .section-title-sidebar { font-size: 1rem; font-weight: 700; color: #cbd5e0; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #4a5568; padding-bottom: 0.5rem; }
            .section-title-main { font-size: 1.5rem; font-weight: 700; color: #2d3748; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
            .personal-info-item { margin-bottom: 0.75rem; display: flex; align-items: center; }
            .personal-info-item i { margin-right: 0.75rem; color: #3b82f6; }
            .personal-info-item a { color: #3b82f6; text-decoration: none; }
            .personal-info-item a:hover { text-decoration: underline; }
            .skill-tag { background-color: #4a5568; color: #fff; padding: 0.3rem 0.7rem; border-radius: 4px; font-size: 0.85rem; margin-right: 0.5rem; margin-bottom: 0.5rem; display: inline-block; }
            .job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
            .job-header h3 { font-size: 1.2rem; font-weight: 600; color: #2d3748; margin: 0; }
            .job-header span { font-size: 0.9rem; color: #4a5568; }
            .job-details { font-size: 0.95rem; color: #555; margin-bottom: 0.75rem; }
            .job-description ul { list-style: disc; margin-left: 1.5rem; }
            .job-description li { margin-bottom: 0.4rem; }
        </style>
        <div class="bg-white p-8 rounded-lg shadow-md mb-8">
            <h1 class="text-5xl font-extrabold text-center text-blue-700 mb-2">{{personalInfo.name}}</h1>
            <p class="text-center text-gray-600 text-lg">{{summary}}</p>
        </div>

        <div class="resume-grid">
            <div class="sidebar">
                <div class="mb-8">
                    <h2 class="section-title-sidebar">Contato</h2>
                    <div class="text-sm">
                        <p class="personal-info-item"><i class="fas fa-envelope"></i> <a href="mailto:{{personalInfo.email}}">{{personalInfo.email}}</a></p>
                        <p class="personal-info-item"><i class="fas fa-phone"></i> {{personalInfo.phone}}</p>
                        <p class="personal-info-item"><i class="fab fa-linkedin"></i> <a href="{{personalInfo.linkedin}}" target="_blank">LinkedIn</a></p>
                        {{#if personalInfo.portfolio}}
                        <p class="personal-info-item"><i class="fas fa-globe"></i> <a href="{{personalInfo.portfolio}}" target="_blank">Portfólio</a></p>
                        {{/if}}
                    </div>
                </div>

                <div class="mb-8">
                    <h2 class="section-title-sidebar">Habilidades</h2>
                    <div>
                        {{#each skills}}
                        <span class="skill-tag">{{this}}</span>
                        {{/each}}
                    </div>
                </div>

                {{#if certifications}}
                <div>
                    <h2 class="section-title-sidebar">Certificações</h2>
                    <ul class="list-none text-sm text-gray-300">
                        {{#each certifications}}
                        <li class="mb-1">{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
                {{/if}}
            </div>

            <div class="main-content">
                <div class="mb-8">
                    <h2 class="section-title-main">Experiência</h2>
                    {{#each experience}}
                    <div class="mb-6">
                        <div class="job-header">
                            <h3>{{this.title}}</h3>
                            <span>{{this.dates}}</span>
                        </div>
                        <p class="job-details">{{this.company}}</p>
                        <div class="job-description">
                            <p>{{this.description}}</p>
                        </div>
                    </div>
                    {{/each}}
                </div>

                <div>
                    <h2 class="section-title-main">Educação</h2>
                    {{#each education}}
                    <div class="mb-6">
                        <div class="job-header">
                            <h3>{{this.degree}}</h3>
                            <span>{{this.dates}}</span>
                        </div>
                        <p class="job-details">{{this.institution}}</p>
                        <p class="text-gray-700">{{this.description}}</p>
                    </div>
                    {{/each}}
                </div>

                {{#if projects}}
                <div class="mb-8">
                    <h2 class="section-title-main">Projetos</h2>
                    {{#each projects}}
                    <div class="mb-6">
                        <div class="job-header">
                            <h3>{{this.name}}</h3>
                            <span>{{this.technologies}}</span>
                        </div>
                        <p class="text-gray-700">{{this.description}}</p>
                    </div>
                    {{/each}}
                </div>
                {{/if}}
            </div>
        </div>
    </div>
    `,
    creative: `
    <div class="bg-gradient-to-br from-purple-100 to-blue-100 p-8 max-w-3xl mx-auto font-sans text-gray-900 shadow-xl rounded-lg my-8">
        <style>
            .resume-header-creative { text-align: center; margin-bottom: 3rem; background-color: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .resume-header-creative h1 { font-size: 3rem; font-weight: 800; color: #4c51bf; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); margin-bottom: 0.5rem; }
            .resume-header-creative p { font-size: 1rem; color: #667eea; font-weight: 500; }
            .resume-section { background-color: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 2rem; }
            .section-title-creative { font-size: 1.75rem; font-weight: 700; color: #4c51bf; margin-bottom: 1.5rem; text-align: center; position: relative; }
            .section-title-creative::after { content: ''; display: block; width: 50px; height: 3px; background-color: #667eea; margin: 0.5rem auto 0; border-radius: 2px; }
            .job-item { margin-bottom: 1.5rem; border-bottom: 1px dashed #e2e8f0; padding-bottom: 1.5rem; }
            .job-item:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
            .job-header-creative { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
            .job-header-creative h3 { font-size: 1.2rem; font-weight: 700; color: #2d3748; margin: 0; }
            .job-header-creative span { font-size: 0.9rem; color: #718096; }
            .company-creative { font-style: italic; color: #555; margin-bottom: 0.75rem; }
            .description-creative ul { list-style: none; padding-left: 0; }
            .description-creative li { position: relative; padding-left: 1.5rem; margin-bottom: 0.5rem; }
            .description-creative li::before { content: '•'; position: absolute; left: 0; color: #667eea; font-weight: bold; }
            .skill-category-creative { font-weight: 700; color: #2d3748; margin-bottom: 0.75rem; font-size: 1.1rem; }
            .skill-list-creative { display: flex; flex-wrap: wrap; gap: 0.75rem; }
            .skill-item-creative { background-color: #e0e7ff; color: #4c51bf; padding: 0.4rem 1rem; border-radius: 25px; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        </style>

        <div class="resume-header-creative">
            <h1>{{personalInfo.name}}</h1>
            <p>
                {{personalInfo.email}} | {{personalInfo.phone}} | 
                <a href="{{personalInfo.linkedin}}" target="_blank" class="text-purple-600 hover:underline">LinkedIn</a> | 
                <a href="{{personalInfo.portfolio}}" target="_blank" class="text-purple-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="resume-section">
            <h2 class="section-title-creative">Resumo</h2>
            <p class="text-gray-700 leading-relaxed text-center">{{summary}}</p>
        </div>

        <div class="resume-section">
            <h2 class="section-title-creative">Experiência</h2>
            {{#each experience}}
            <div class="job-item">
                <div class="job-header-creative">
                    <h3>{{this.title}}</h3>
                    <span>{{this.dates}}</span>
                </div>
                <p class="company-creative">{{this.company}}</p>
                <div class="description-creative text-gray-700">
                    <p>{{this.description}}</p>
                </div>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <h2 class="section-title-creative">Educação</h2>
            {{#each education}}
            <div class="job-item">
                <div class="job-header-creative">
                    <h3>{{this.degree}}</h3>
                    <span>{{this.dates}}</span>
                </div>
                <p class="company-creative">{{this.institution}}</p>
                <p class="text-gray-700">{{this.description}}</p>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <h2 class="section-title-creative">Habilidades</h2>
            <div class="skill-list-creative">
                {{#each skills}}
                <span class="skill-item-creative">{{this}}</span>
                {{/each}}
            </div>
        </div>

        {{#if projects}}
        <div class="resume-section">
            <h2 class="section-title-creative">Projetos</h2>
            {{#each projects}}
            <div class="job-item">
                <div class="job-header-creative">
                    <h3>{{this.name}}</h3>
                    <span>{{this.technologies}}</span>
                </div>
                <p class="text-gray-700">{{this.description}}</p>
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if certifications}}
        <div class="resume-section">
            <h2 class="section-title-creative">Certificações</h2>
            <ul class="description-creative text-gray-700">
                {{#each certifications}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </div>
        {{/if}}
    </div>
    `,
    tech: `
    <div class="bg-gray-900 p-8 max-w-3xl mx-auto font-mono text-gray-200 shadow-xl rounded-lg my-8 border-t-4 border-green-500">
        <style>
            .resume-section { margin-bottom: 2rem; }
            .section-title-tech { font-size: 1.5rem; font-weight: 700; color: #10b981; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px dashed #374151; padding-bottom: 0.5rem; }
            .personal-info-tech p { margin-bottom: 0.5rem; }
            .personal-info-tech a { color: #34d399; text-decoration: none; }
            .personal-info-tech a:hover { text-decoration: underline; }
            .job-header-tech { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
            .job-header-tech h3 { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; margin: 0; }
            .job-header-tech span { font-size: 0.8rem; color: #9ca3af; }
            .job-details-tech { font-size: 0.9rem; color: #a0aec0; margin-bottom: 0.5rem; }
            .job-description-tech ul { list-style: none; padding-left: 0; }
            .job-description-tech li { position: relative; padding-left: 1.25rem; margin-bottom: 0.4rem; }
            .job-description-tech li::before { content: '>'; position: absolute; left: 0; color: #10b981; font-weight: bold; }
            .skill-list-tech { display: flex; flex-wrap: wrap; gap: 0.6rem; }
            .skill-item-tech { background-color: #374151; color: #34d399; padding: 0.3rem 0.8rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid #4b5563; }
        </style>

        <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-green-500 mb-2">{{personalInfo.name}}</h1>
            <div class="personal-info-tech text-gray-400 text-sm">
                <p>{{personalInfo.email}} | {{personalInfo.phone}}</p>
                <p><a href="{{personalInfo.linkedin}}" target="_blank">LinkedIn</a> | <a href="{{personalInfo.portfolio}}" target="_blank">Portfólio</a></p>
            </div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Resumo</h2>
            <p class="text-gray-300 leading-relaxed">{{summary}}</p>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Experiência</h2>
            {{#each experience}}
            <div class="mb-5">
                <div class="job-header-tech">
                    <h3>{{this.title}}</h3>
                    <span>{{this.dates}}</span>
                </div>
                <p class="job-details-tech">{{this.company}}</p>
                <div class="job-description-tech text-gray-300">
                    <p>{{this.description}}</p>
                </div>
            </div>
            {{/each}}
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Habilidades</h2>
            <div class="skill-list-tech">
                {{#each skills}}
                <span class="skill-item-tech">{{this}}</span>
                {{/each}}
            </div>
        </div>

        <div class="resume-section">
            <h2 class="section-title-tech">Educação</h2>
            {{#each education}}
            <div class="mb-5">
                <div class="job-header-tech">
                    <h3>{{this.degree}}</h3>
                    <span>{{this.dates}}</span>
                </div>
                <p class="job-details-tech">{{this.institution}}</p>
                <p class="text-gray-300">{{this.description}}</p>
            </div>
            {{/each}}
        </div>

        {{#if projects}}
        <div class="resume-section">
            <h2 class="section-title-tech">Projetos</h2>
            {{#each projects}}
            <div class="mb-5">
                <div class="job-header-tech">
                    <h3>{{this.name}}</h3>
                    <span>{{this.technologies}}</span>
                </div>
                <p class="text-gray-300">{{this.description}}</p>
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if certifications}}
        <div class="resume-section">
            <h2 class="section-title-tech">Certificações</h2>
            <ul class="job-description-tech text-gray-300">
                {{#each certifications}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </div>
        {{/if}}
    </div>
    `,
    compact: `
    <div class="bg-white p-6 max-w-2xl mx-auto font-sans text-gray-800 shadow-md rounded-lg my-8 border-l-4 border-gray-600">
        <style>
            .resume-header-compact { margin-bottom: 1.5rem; }
            .resume-header-compact h1 { font-size: 2rem; font-weight: 700; color: #2d3748; margin-bottom: 0.25rem; }
            .resume-header-compact p { font-size: 0.85rem; color: #4a5568; }
            .section-title-compact { font-size: 1.1rem; font-weight: 600; color: #333; margin-top: 1.25rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.5rem; }
            .item-header-compact { font-weight: 600; color: #2d3748; }
            .item-subheader-compact { font-style: italic; color: #555; margin-bottom: 0.25rem; }
            .item-description-compact ul { list-style: disc; margin-left: 1.25rem; }
            .item-description-compact li { margin-bottom: 0.3rem; }
            .skill-list-compact { display: inline; }
            .skill-item-compact { margin-right: 0.5rem; margin-bottom: 0.5rem; display: inline-block; font-size: 0.85rem; }
            .skill-item-compact::after { content: '•'; margin-left: 0.5rem; }
            .skill-item-compact:last-child::after { content: ''; }
        </style>

        <div class="resume-header-compact">
            <h1>{{personalInfo.name}}</h1>
            <p>
                {{personalInfo.email}} | {{personalInfo.phone}} | 
                <a href="{{personalInfo.linkedin}}" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a> | 
                <a href="{{personalInfo.portfolio}}" target="_blank" class="text-blue-600 hover:underline">Portfólio</a>
            </p>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Resumo</h2>
            <p>{{summary}}</p>
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Experiência</h2>
            {{#each experience}}
            <div class="mb-3">
                <p class="item-header-compact">{{this.title}}, {{this.company}} ({{this.dates}})</p>
                <div class="item-description-compact">
                    <p>{{this.description}}</p>
                </div>
            </div>
            {{/each}}
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Educação</h2>
            {{#each education}}
            <div class="mb-3">
                <p class="item-header-compact">{{this.degree}}, {{this.institution}} ({{this.dates}})</p>
                <p class="text-gray-700">{{this.description}}</p>
            </div>
            {{/each}}
        </div>

        <div class="mb-4">
            <h2 class="section-title-compact">Habilidades</h2>
            <div class="skill-list-compact text-gray-700">
                {{#each skills}}
                <span class="skill-item-compact">{{this}}</span>
                {{/each}}
            </div>
        </div>

        {{#if projects}}
        <div class="mb-4">
            <h2 class="section-title-compact">Projetos</h2>
            {{#each projects}}
            <div class="mb-3">
                <p class="item-header-compact">{{this.name}} ({{this.technologies}})</p>
                <p class="text-gray-700">{{this.description}}</p>
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if certifications}}
        <div class="mb-4">
            <h2 class="section-title-compact">Certificações</h2>
            <ul class="item-description-compact text-gray-700">
                {{#each certifications}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </div>
        {{/if}}
    </div>
    `,
    creative_sidebar: `
    <div class="bg-white max-w-3xl mx-auto font-sans text-gray-800 shadow-xl rounded-lg my-8 flex">
        <style>
            .sidebar-creative { width: 30%; background-color: #e0e7ff; color: #2d3748; padding: 2rem; border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
            .main-content-creative { width: 70%; padding: 2rem; }
            .photo-frame { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; margin: 0 auto 1.5rem; border: 4px solid #a7b4f5; box-shadow: 0 0 0 2px #e0e7ff; }
            .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
            .name-creative { font-size: 2rem; font-weight: 700; color: #4c51bf; text-align: center; margin-bottom: 0.5rem; }
            .title-creative { font-size: 1rem; color: #667eea; text-align: center; margin-bottom: 1.5rem; }
            .contact-item { margin-bottom: 1rem; display: flex; align-items: center; font-size: 0.95rem; }
            .contact-item i { margin-right: 0.75rem; color: #4c51bf; }
            .contact-item a { color: #4c51bf; text-decoration: none; }
            .contact-item a:hover { text-decoration: underline; }
            .section-title-sidebar-creative { font-size: 1.1rem; font-weight: 700; color: #4c51bf; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid #a7b4f5; padding-bottom: 0.5rem; }
            .skill-item-creative-sidebar { background-color: #a7b4f5; color: #fff; padding: 0.3rem 0.7rem; border-radius: 4px; font-size: 0.85rem; margin-right: 0.5rem; margin-bottom: 0.5rem; display: inline-block; }
            .main-section-title-creative { font-size: 1.5rem; font-weight: 700; color: #2d3748; margin-bottom: 1.5rem; border-bottom: 2px solid #a7b4f5; padding-bottom: 0.5rem; }
            .job-header-creative-main { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
            .job-header-creative-main h3 { font-size: 1.1rem; font-weight: 600; color: #2d3748; margin: 0; }
            .job-header-creative-main span { font-size: 0.9rem; color: #718096; }
            .job-details-creative-main { font-size: 0.95rem; color: #555; margin-bottom: 0.75rem; }
            .job-description-creative-main ul { list-style: disc; margin-left: 1.5rem; }
            .job-description-creative-main li { margin-bottom: 0.4rem; }
        </style>

        <div class="sidebar-creative">
            <div class="photo-frame">
                <img src="https://via.placeholder.com/120x120?text=Sua+Foto" alt="Sua Foto de Perfil">
            </div>
            <h1 class="name-creative">{{personalInfo.name}}</h1>
            <p class="title-creative">{{personalInfo.title_or_summary_short}}</p>

            <div class="mb-6">
                <div class="contact-item"><i class="fas fa-envelope"></i> <a href="mailto:{{personalInfo.email}}">{{personalInfo.email}}</a></div>
                <div class="contact-item"><i class="fas fa-phone"></i> {{personalInfo.phone}}</div>
                <div class="contact-item"><i class="fab fa-linkedin"></i> <a href="{{personalInfo.linkedin}}" target="_blank">LinkedIn</a></div>
                {{#if personalInfo.portfolio}}
                <div class="contact-item"><i class="fas fa-globe"></i> <a href="{{personalInfo.portfolio}}" target="_blank">Portfólio</a></div>
                {{/if}}
            </div>

            <h2 class="section-title-sidebar-creative">Habilidades</h2>
            <div class="text-sm">
                {{#each skills}}
                <span class="skill-item-creative-sidebar">{{this}}</span>
                {{/each}}
            </div>

            {{#if certifications}}
            <h2 class="section-title-sidebar-creative">Certificações</h2>
            <ul class="list-none text-sm text-gray-800 mt-2">
                {{#each certifications}}
                <li class="mb-1">{{this}}</li>
                {{/each}}
            </ul>
            {{/if}}
        </div>

        <div class="main-content-creative">
            <div class="mb-8">
                <h2 class="main-section-title-creative">Resumo Profissional</h2>
                <p class="text-gray-700 leading-relaxed">{{summary}}</p>
            </div>

            <div class="mb-8">
                <h2 class="main-section-title-creative">Experiência</h2>
                {{#each experience}}
                <div class="mb-6">
                    <div class="job-header-creative-main">
                        <h3>{{this.title}}</h3>
                        <span>{{this.dates}}</span>
                    </div>
                    <p class="job-details-creative-main">{{this.company}}</p>
                    <div class="job-description-creative-main text-gray-700">
                        <p>{{this.description}}</p>
                    </div>
                </div>
                {{/each}}
            </div>

            <div class="mb-8">
                <h2 class="main-section-title-creative">Educação</h2>
                {{#each education}}
                <div class="mb-6">
                    <div class="job-header-creative-main">
                        <h3>{{this.degree}}</h3>
                        <span>{{this.dates}}</span>
                    </div>
                    <p class="job-details-creative-main">{{this.institution}}</p>
                    <p class="text-gray-700">{{this.description}}</p>
                </div>
                {{/each}}
            </div>

            {{#if projects}}
            <div class="mb-8">
                <h2 class="main-section-title-creative">Projetos</h2>
                {{#each projects}}
                <div class="mb-6">
                    <div class="job-header-creative-main">
                        <h3>{{this.name}}</h3>
                        <span>{{this.technologies}}</span>
                    </div>
                    <p class="text-gray-700">{{this.description}}</p>
                </div>
                {{/each}}
            </div>
            {{/if}}
        </div>
    </div>
    `
};
