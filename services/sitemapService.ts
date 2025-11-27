
import { api } from './api';

export const generateSitemapXML = async () => {
  try {
    // Busca todas as notícias públicas aprovadas
    const { data: news, error } = await api.select('news', { status: 'approved' });
    
    if (error) throw error;

    const baseUrl = window.location.origin; // Ou URL de produção definida em env
    const currentDate = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

    if (news && news.length > 0) {
        news.forEach((item: any) => {
            // Cria um slug simples baseada no ID (já que não temos slugs reais no banco ainda)
            // Idealmente, adicionaríamos um campo 'slug' na tabela news.
            const slug = `news/${item.id}`; 
            xml += `
  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${new Date(item.criado_em).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });
    }

    xml += `
</urlset>`;

    return xml;
  } catch (e) {
    console.error("Erro ao gerar sitemap:", e);
    return null;
  }
};

export const downloadSitemap = async () => {
    const xml = await generateSitemapXML();
    if (!xml) {
        alert("Falha ao gerar Sitemap. Verifique o console.");
        return;
    }
    
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
