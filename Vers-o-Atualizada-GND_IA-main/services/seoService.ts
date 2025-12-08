
export interface SEOAnalysisResult {
  score: number;
  results: SEOCheckResult[];
}

export interface SEOCheckResult {
  test: string;
  status: 'good' | 'warning' | 'critical';
  message: string;
}

export interface OptimizedMeta {
  title: string;
  slug: string;
  description: string;
  keyword: string;
}

// Lista expandida de Stop Words para análise precisa
const STOP_WORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 
  'e', 'que', 'para', 'com', 'por', 'um', 'uma', 'uns', 'umas', 'é', 'são', 'foi', 
  'se', 'mas', 'ou', 'não', 'eu', 'ele', 'nós', 'eles', 'este', 'esta', 'isso', 'aquilo',
  'sobre', 'entre', 'até', 'após', 'como', 'quando', 'onde', 'qual', 'quem', 'ser', 'ter',
  'está', 'estão', 'foi', 'foram', 'tinha', 'tinham', 'vai', 'vão'
]);

/**
 * Lógica Avançada de Seleção de Palavra-chave "Golden Keyword"
 * Objetivo: Encontrar a palavra (ou bigrama) que está PRESENTE no Título E no Início do Texto.
 */
export const suggestFocusKeyword = (title: string, content: string): string => {
  if (!title || !content) return 'conteúdo';

  // Normaliza texto para tokenização
  const normalize = (t: string) => t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const titleTokens = normalize(title);
  
  // Analisa apenas os primeiros 300 caracteres do conteúdo (Introdução)
  const introText = content.substring(0, 300).toLowerCase();
  const introTokens = normalize(introText);

  // 1. Tenta encontrar uma correspondência exata de Bigrama (Duas palavras)
  // Ex: "Inteligência Artificial"
  for (let i = 0; i < titleTokens.length - 1; i++) {
    const bigram = `${titleTokens[i]} ${titleTokens[i+1]}`;
    if (introText.includes(bigram)) {
      return bigram; // Jackpot! Melhor palavra-chave possível.
    }
  }

  // 2. Se não, busca a palavra mais forte do título que também está na introdução
  // Prioriza palavras mais longas (geralmente substantivos mais específicos)
  const intersection = titleTokens.filter(t => introTokens.includes(t));
  
  if (intersection.length > 0) {
    // Ordena por comprimento (palavras maiores costumam ser melhores chaves)
    return intersection.sort((a, b) => b.length - a.length)[0];
  }

  // 3. Fallback: Usa a palavra mais significativa do título
  return titleTokens.sort((a, b) => b.length - a.length)[0] || 'notícia';
};

/**
 * Gera Tags Otimizadas para SEO (Limites de caracteres Matemáticos)
 * Garante que a palavra-chave esteja presente para maximizar o score.
 */
export const generateOptimizedTags = (title: string, content: string, keyword: string): OptimizedMeta => {
  // 1. Slug Otimizado
  const slug = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  // 2. Título SEO (Hard Limit: 60 caracteres)
  let seoTitle = title.trim();
  
  // Se o título original não contiver a palavra-chave (raro, mas possível), insira forçadamente
  if (!seoTitle.toLowerCase().includes(keyword.toLowerCase())) {
      seoTitle = `${keyword}: ${seoTitle}`;
  }

  // Corta para caber em 60 chars mantendo a palavra-chave visível
  if (seoTitle.length > 60) {
      if (keyword.length < 50) {
          // Tenta formato: "Keyword: Resumo..."
          const remainingChars = 57 - keyword.length;
          const shortTitle = title.substring(0, remainingChars);
          seoTitle = `${keyword}: ${shortTitle}...`;
      } else {
          // Keyword gigante? Usa só ela.
          seoTitle = keyword.substring(0, 60);
      }
  }

  // 3. Meta Description (Hard Limit: 160 caracteres)
  // Limpa markdown
  const plainText = content.replace(/[*#_`]/g, '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  let metaDesc = '';

  // Estratégia "Force Keyword": Começa a descrição com a palavra-chave para garantir densidade
  // Frases de gancho variadas
  const hooks = [
      `Saiba tudo sobre ${keyword}.`,
      `Entenda o impacto de ${keyword}.`,
      `Confira os detalhes sobre ${keyword}.`,
      `${keyword}: o que você precisa saber.`
  ];
  const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];

  // Completa com o início do texto original até dar 157 chars
  const remainingSpace = 157 - selectedHook.length;
  const contentSnippet = plainText.substring(0, remainingSpace).trim();
  
  metaDesc = `${selectedHook} ${contentSnippet}...`;

  return {
    title: seoTitle,
    slug: slug,
    description: metaDesc,
    keyword: keyword
  };
};

export const analyzeSEO = (content: string, seoTitle: string, keyword: string): SEOAnalysisResult => {
  const results: SEOCheckResult[] = [];
  let score = 100; // Começa com 100 e penaliza
  
  const cleanContent = content.replace(/<[^>]*>?/gm, '');
  const lowerContent = cleanContent.toLowerCase();
  const lowerTitle = seoTitle.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const wordCount = cleanContent.split(/\s+/).length;

  // --- CHECAGENS CRÍTICAS (Penalidade Alta) ---

  // 1. Keyword no Título SEO
  if (lowerTitle.includes(lowerKeyword)) {
    results.push({ test: 'Título SEO', status: 'good', message: 'Palavra-chave presente no Título SEO.' });
  } else {
    score -= 40; // Penalidade massiva, pois quebra o propósito
    results.push({ test: 'Título SEO', status: 'critical', message: 'CRÍTICO: Palavra-chave ausente no Título SEO.' });
  }

  // 2. Keyword no Início do Conteúdo (Primeiros 10%)
  const introLimit = Math.min(200, lowerContent.length);
  const intro = lowerContent.substring(0, introLimit);
  
  if (intro.includes(lowerKeyword)) {
    results.push({ test: 'Introdução', status: 'good', message: 'Palavra-chave encontrada na introdução.' });
  } else {
    score -= 20;
    results.push({ test: 'Introdução', status: 'warning', message: 'Tente colocar a palavra-chave na primeira frase.' });
  }

  // 3. Tamanho do Título SEO
  if (seoTitle.length <= 60) {
    results.push({ test: 'Tamanho Título', status: 'good', message: `${seoTitle.length}/60 caracteres (Perfeito).` });
  } else {
    score -= 10;
    results.push({ test: 'Tamanho Título', status: 'warning', message: 'Título muito longo (>60 chars). Pode ser cortado no Google.' });
  }

  // 4. Tamanho do Conteúdo
  if (wordCount > 200) {
    results.push({ test: 'Extensão', status: 'good', message: `${wordCount} palavras (Bom tamanho).` });
  } else {
    // Não penaliza score severamente se for short-copy, apenas avisa
    results.push({ test: 'Extensão', status: 'warning', message: 'Texto curto. Considere expandir para SEO profundo.' });
  }

  // 5. Densidade
  // Simplificado para garantir aprovação se a palavra aparece pelo menos 2 vezes no total (Intro + Corpo)
  const count = lowerContent.split(lowerKeyword).length - 1;
  if (count >= 2) {
      results.push({ test: 'Densidade', status: 'good', message: `Palavra-chave aparece ${count} vezes.` });
  } else {
      score -= 5;
      results.push({ test: 'Densidade', status: 'warning', message: 'Use a palavra-chave mais vezes no texto.' });
  }

  return {
    score: Math.max(0, score),
    results
  };
};
