

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getNewsWithAuthors } from '../../services/adminService';
import { NewsArticle, NewsStatus } from '../../types';
import { Pagination } from './Pagination';

type StatusFilter = NewsStatus | 'all';

export const AllNewsViewer: React.FC<{ dataVersion: number }> = ({ dataVersion }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [totalNews, setTotalNews] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 10;

  const fetchNews = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const { news: newsList, count } = await getNewsWithAuthors({ 
          page: currentPage, 
          limit: newsPerPage,
          status: statusFilter,
        });
        setNews(newsList);
        setTotalNews(count);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar o histórico de notícias.');
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
  
  const totalPages = Math.ceil(totalNews / newsPerPage);
  
  const getStatusChip = (status: NewsStatus) => {
    const baseClasses = "px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider";
    switch(status) {
        case 'approved': return `${baseClasses} bg-green-900/30 text-green-400`;
        case 'rejected': return `${baseClasses} bg-red-900/30 text-red-400`;
        case 'pending': return `${baseClasses} bg-yellow-900/30 text-yellow-400`;
        default: return `${baseClasses} bg-gray-800/30 text-gray-400`;
    }
  };

  if (loading) return <div className="text-center p-4">Carregando histórico...</div>;
  if (error) return <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>;

  return (
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-green-400">Histórico de Notícias</h2>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500"
        >
          <option value="all">Todos</option>
          <option value="pending">Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
        </select>
      </div>
       <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-green-300 uppercase bg-black/40">
              <tr>
                <th scope="col" className="px-6 py-3">Título</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Tipo</th>
                <th scope="col" className="px-6 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {news.map(article => (
                <tr key={article.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                  <td className="px-6 py-4 font-medium whitespace-nowrap max-w-xs truncate" title={article.titulo}>{article.titulo}</td>
                  <td className="px-6 py-4"><span className={getStatusChip(article.status || 'pending')}>{article.status}</span></td>
                  <td className="px-6 py-4">{article.tipo}</td>
                  <td className="px-6 py-4">{new Date(article.criado_em || '').toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};
