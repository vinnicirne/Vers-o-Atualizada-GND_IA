import React, { useState, useEffect, useCallback } from 'react';
import { getNewsWithAuthors, updateNewsStatus } from '../../services/adminService';
import { NewsArticle, NewsStatus } from '../../types';
import { Pagination } from './Pagination';
import { useUser } from '../../contexts/UserContext';

interface NewsApprovalTableProps {
    onEdit: (article: NewsArticle) => void;
    dataVersion: number;
}

export const NewsApprovalTable: React.FC<NewsApprovalTableProps> = ({ onEdit, dataVersion }) => {
  const { user: adminUser } = useUser();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 10;

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { news: newsList } = await getNewsWithAuthors({ status: 'pending' });
      setNews(newsList);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar notícias pendentes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews, dataVersion]);
  
  const handleStatusChange = async (newsId: number, status: NewsStatus) => {
    if (!adminUser) {
        setError("Sessão de administrador inválida.");
        return;
    }
    try {
        await updateNewsStatus(newsId, status, adminUser.id);
        setNews(news.filter(n => n.id !== newsId)); // Remove from list after action
    } catch (error: any) {
        setError(error.message || "Falha ao atualizar o status da notícia.");
    }
  };
  
  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);


  if (loading) return <div className="text-center p-4">Carregando notícias...</div>;
  if (error) return <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>;

  return (
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <h2 className="text-2xl font-bold text-green-400 mb-4">Aprovação de Notícias</h2>
      {news.length === 0 && !loading ? (
        <p className="text-gray-400">Nenhuma notícia pendente de aprovação.</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-green-300 uppercase bg-black/40">
              <tr>
                <th scope="col" className="px-6 py-3">Título</th>
                <th scope="col" className="px-6 py-3">Tipo</th>
                <th scope="col" className="px-6 py-3">Data</th>
                <th scope="col" className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {currentNews.map(article => (
                <tr key={article.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                  <td className="px-6 py-4 font-medium whitespace-nowrap max-w-xs truncate" title={article.titulo}>{article.titulo}</td>
                  <td className="px-6 py-4">{article.tipo}</td>
                   <td className="px-6 py-4">{new Date(article.criado_em || '').toLocaleString('pt-BR', { dateStyle: 'short' })}</td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button onClick={() => onEdit(article)} className="font-medium text-yellow-400 hover:underline">Editar</button>
                    <button onClick={() => article.id && handleStatusChange(article.id, 'approved')} className="font-medium text-green-400 hover:underline">Aprovar</button>
                    <button onClick={() => article.id && handleStatusChange(article.id, 'rejected')} className="font-medium text-red-400 hover:underline">Rejeitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  );
};
