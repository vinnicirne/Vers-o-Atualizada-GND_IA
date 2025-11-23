import React, { useState, useEffect, useCallback } from 'react';
import { getNewsWithAuthors, updateNewsStatus } from '../../services/adminService';
import { NewsArticle, NewsStatus } from '../../types';
import { Pagination } from './Pagination';
import { NewsViewModal } from './NewsViewModal';
import { useUser } from '../../contexts/UserContext';

const NEWS_PER_PAGE = 10;

interface NewsTableProps {
    onEdit: (article: NewsArticle) => void;
    dataVersion: number;
}

export const NewsTable: React.FC<NewsTableProps> = ({ onEdit, dataVersion }) => {
  const { user: adminUser } = useUser();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [totalNews, setTotalNews] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [viewingArticle, setViewingArticle] = useState<NewsArticle | null>(null);

  // Filtering and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<NewsStatus | 'all'>('all');

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { news: newsList, count } = await getNewsWithAuthors({ 
          page: currentPage, 
          limit: NEWS_PER_PAGE,
          status: statusFilter,
      });
      setNews(newsList);
      setTotalNews(count);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar notícias.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews, dataVersion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleStatusChange = async (newsId: number, status: NewsStatus) => {
    if (!adminUser) {
        setError("Sessão de administrador inválida.");
        return;
    }
    try {
      await updateNewsStatus(newsId, status, adminUser.id);
      fetchNews(); // Refresh data
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar o status da notícia.");
    }
  };

  const getStatusChip = (status?: NewsStatus) => {
    const baseClasses = "px-2 py-1 text-xs font-bold rounded-full capitalize";
    switch(status) {
        case 'approved': return `${baseClasses} bg-green-900/50 text-green-300`;
        case 'rejected': return `${baseClasses} bg-red-900/50 text-red-400`;
        case 'pending': return `${baseClasses} bg-yellow-900/50 text-yellow-400`;
        default: return `${baseClasses} bg-gray-800/50 text-gray-400`;
    }
  };

  const totalPages = Math.ceil(totalNews / NEWS_PER_PAGE);

  return (
    <>
      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-2xl font-bold text-green-400 whitespace-nowrap">Gerenciamento de Notícias</h2>
          <div className="flex items-center space-x-4">
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as NewsStatus | 'all')}
                className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovada</option>
              <option value="rejected">Rejeitada</option>
            </select>
          </div>
        </div>

        {loading && <div className="text-center p-4">Carregando notícias...</div>}
        {error && <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>}
        
        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-green-300 uppercase bg-black/40">
                  <tr>
                    <th scope="col" className="px-6 py-3">Título</th>
                    <th scope="col" className="px-6 py-3">Autor</th>
                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                    <th scope="col" className="px-6 py-3">Data</th>
                    <th scope="col" className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {news.map(article => (
                    <tr key={article.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                      <td className="px-6 py-4 font-medium whitespace-nowrap max-w-xs truncate" title={article.titulo}>{article.titulo}</td>
                      <td className="px-6 py-4 text-gray-400">{article.author?.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={getStatusChip(article.status)}>{article.status}</span>
                      </td>
                      <td className="px-6 py-4">{new Date(article.criado_em || '').toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => setViewingArticle(article)} className="font-medium text-blue-400 hover:underline">Ver</button>
                        <button onClick={() => onEdit(article)} className="font-medium text-yellow-400 hover:underline">Editar</button>
                        {article.status === 'pending' && article.id && (
                          <>
                            <button onClick={() => handleStatusChange(article.id!, 'approved')} className="font-medium text-green-400 hover:underline">Aprovar</button>
                            <button onClick={() => handleStatusChange(article.id!, 'rejected')} className="font-medium text-red-400 hover:underline">Rejeitar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {news.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma notícia encontrada para os filtros selecionados.</p>}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {viewingArticle && (
        <NewsViewModal article={viewingArticle} onClose={() => setViewingArticle(null)} />
      )}
    </>
  );
};