
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
    statusFilter?: NewsStatus | 'all'; // Now optional and can be passed
}

export function NewsTable({ onEdit, dataVersion, statusFilter: initialStatusFilter = 'all' }: NewsTableProps) {
  const { user: adminUser } = useUser();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [totalNews, setTotalNews] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [viewingArticle, setViewingArticle] = useState<NewsArticle | null>(null);

  // Filtering and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStatusFilter, setCurrentStatusFilter] = useState<NewsStatus | 'all'>(initialStatusFilter);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { news: newsList, count } = await getNewsWithAuthors({ 
          page: currentPage, 
          limit: NEWS_PER_PAGE,
          status: currentStatusFilter,
      });
      setNews(newsList);
      setTotalNews(count);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar notícias.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentStatusFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews, dataVersion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentStatusFilter]);

  useEffect(() => {
    // Update local filter state if initialStatusFilter changes (e.g., when switching tabs in NewsManager)
    setCurrentStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

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

  const getTypeChip = (type?: string) => {
    const base = "px-2 py-1 text-xs font-bold rounded-full border";
    switch(type) {
        case 'news_generator': return `${base} bg-green-900/30 text-green-300 border-green-800`;
        case 'image_generation': return `${base} bg-purple-900/30 text-purple-300 border-purple-800`;
        case 'landingpage_generator': return `${base} bg-pink-900/30 text-pink-300 border-pink-800`;
        case 'institutional_website_generator': return `${base} bg-orange-900/30 text-orange-300 border-orange-800`;
        case 'canva_structure': return `${base} bg-cyan-900/30 text-cyan-300 border-cyan-800`;
        case 'text_to_speech': return `${base} bg-blue-900/30 text-blue-300 border-blue-800`;
        default: return `${base} bg-gray-800 text-gray-400 border-gray-700`;
    }
  };

  const getTypeName = (type?: string) => {
      if(!type) return 'GERAL';
      if(type === 'news_generator') return 'NOTÍCIA';
      if(type === 'image_generation') return 'IMAGEM';
      if(type === 'landingpage_generator') return 'LANDING PAGE';
      if(type === 'institutional_website_generator') return 'SITE INST.';
      if(type === 'canva_structure') return 'SOCIAL MEDIA';
      if(type === 'copy_generator') return 'COPY';
      if(type === 'text_to_speech') return 'ÁUDIO';
      if(type === 'prompt_generator') return 'PROMPT';
      return type.toUpperCase().replace('_', ' ');
  };

  const totalPages = Math.ceil(totalNews / NEWS_PER_PAGE);

  return (
    <>
      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-2xl font-bold text-green-400 whitespace-nowrap">Gerenciamento de Histórico</h2>
          <div className="flex items-center space-x-4">
            {initialStatusFilter === 'all' && ( // Only show dropdown if it's the general news view
              <select
                  value={currentStatusFilter}
                  onChange={(e) => setCurrentStatusFilter(e.target.value as NewsStatus | 'all')}
                  className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            )}
          </div>
        </div>

        {loading && <div className="text-center p-4">Carregando histórico...</div>}
        {error && <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>}
        
        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-green-300 uppercase bg-black/40">
                  <tr>
                    <th scope="col" className="px-6 py-3">Título / Prompt</th>
                    <th scope="col" className="px-6 py-3">Tipo</th>
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
                      <td className="px-6 py-4">
                         <span className={getTypeChip(article.tipo)}>{getTypeName(article.tipo)}</span>
                      </td>
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
                            <button onClick={() => handleStatusChange(article.id!, 'rejected')} className="font-medium text-red-400 hover:underline">Rejeitar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {news.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum item encontrado.</p>}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {viewingArticle && (
        <NewsViewModal article={viewingArticle} onClose={() => setViewingArticle(null)} />
      )}
    </>
  );
}
