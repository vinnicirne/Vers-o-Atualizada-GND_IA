import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { NewsGenerator } from './components/NewsGenerator';
import { NewsCard } from './components/NewsCard';
import { Loader } from './components/Loader';
import { generateNews } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { NewsArticle, NewsType } from './types';
import { useUser } from './contexts/UserContext';

interface DashboardPageProps {
  onNavigateToAdmin: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToAdmin }) => {
  const { user, signOut, refresh } = useUser();
  const [news, setNews] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ version: string } | null>(null);

  useEffect(() => {
    fetch('./metadata.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setMetadata(data))
      .catch(err => console.error("Failed to load metadata:", err));
  }, []);

  const handleGenerateNews = useCallback(async (topic: string, newsType: NewsType) => {
    if (!topic.trim()) {
      setError('Por favor, insira um tópico para a notícia.');
      return;
    }

    if (!user) {
      setError('Sessão inválida. Por favor, faça login novamente.');
      return;
    }
    
    // Verificação de Crédito
    if (user.credits !== -1 && user.credits < 1) {
        setError('Créditos insuficientes para gerar notícia. Contate um administrador.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setNews(null);

    try {
      const result = await generateNews(topic, newsType);
      const newsArticle: NewsArticle = {
        ...result,
        tipo: newsType
      };
      setNews(newsArticle);
      
      // Salvar resultados no Supabase e deduzir créditos
      if (user) {
        // Deduzir crédito se o usuário não for admin
        if (user.credits !== -1) {
            const newCredits = user.credits - 1;
            const { error: creditError } = await supabase
                .from('user_credits')
                .update({ credits: newCredits })
                .eq('user_id', user.id);
            
            if (creditError) {
                console.error('Erro do Supabase ao atualizar créditos:', creditError);
                // Não-crítico, mas podemos informar o usuário se necessário
            } else {
                // Atualizar o contexto do usuário para refletir os novos créditos
                await refresh();
            }
        }
        
        // Salvar notícia com status 'pendente'
        const { error: newsError } = await supabase.from('news').insert([{
          autor_id: user.id,
          titulo: result.titulo,
          conteudo: result.conteudo,
          sources: result.sources || null,
          tipo: newsType,
          status: 'pending', // Adicionar status para aprovação do admin
        }]);

        if (newsError) {
            console.error('Erro do Supabase ao salvar notícia:', newsError);
            // Erro não-crítico, então não o mostramos ao usuário
        }
        
        // Salvar log
        const { error: logError } = await supabase.from('logs').insert([{
           usuario_id: user.id,
           acao: `generated_${newsType}_news`,
           modulo: 'Notícias',
        }]);

        if (logError) {
            console.error('Erro do Supabase ao salvar log:', logError);
        }
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(`Falha ao gerar notícia: ${err.message}`);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, refresh]);
  
  const handleLogout = async () => {
    await signOut();
  };

  if (!user) {
    return null; // Ou um loader, mas o App.tsx deve prevenir este estado
  }

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <Header 
        userEmail={user.email} 
        onLogout={handleLogout} 
        isAdmin={user.role === 'admin' || user.role === 'super_admin'}
        onNavigateToAdmin={onNavigateToAdmin}
        userCredits={user.credits}
        userRole={user.role}
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-lg text-gray-400 mb-8">
            Gere notícias sobre eventos das últimas 48 horas ou crie artigos preditivos sobre acontecimentos futuros. Insira um tópico e deixe a IA fazer o resto.
          </p>
          <NewsGenerator onGenerate={handleGenerateNews} isLoading={isLoading} />
          
          {error && (
            <div className="mt-8 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="mt-8">
            {isLoading && <Loader />}
            {news && !isLoading && (
              <NewsCard article={news} />
            )}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Desenvolvido com IA | GDN_IA &copy; 2024 | Versão {metadata?.version || '1.0.3'}</p>
      </footer>
    </div>
  );
};

export default DashboardPage;