

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
  }, [fetchNews, dataVersion]); // Recarrega se dataVersion mudar

  const handleStatusChange = async (articleId: number, newStatus: NewsStatus) => {
    if (!adminUser) {
        setError("Sessão de administrador inválida.");
        return;
    }
    try {
      await updateNewsStatus(articleId, newStatus, adminUser.id);
      fetchNews(); // Recarrega a lista para mostrar o status atualizado
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar status da notícia.');
    }
  };

  const totalPages = Math.ceil(totalNews / NEWS_PER_PAGE);

  const getStatusChip = (status: NewsStatus) => {
    const styles = {
      pending: 'bg-yellow-900/50 text-yellow-400',
      approved: 'bg-green-900/50 text-green-300',
      rejected: 'bg-red-900/50 text-red-400',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${styles[status]}`}>{status}</span>;
  };

  const getTypeName = (type?: string) => {
      if(!type) return 'GERAL';
      if(type === 'news_generator') return 'NOTÍCIA';
      if(type === 'image_generation') return 'IMAGEM';
      if(type === 'landingpage_generator') return 'LANDING PAGE';
      if(type === 'institutional_website_generator') return 'SITE INSTITUCIONAL';
      if(type === 'canva_structure') return 'SOCIAL MEDIA';
      return type.toUpperCase().replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-green-400 whitespace-nowrap">Histórico de Conteúdo</h2>
        {initialStatusFilter === 'all' && ( // Só mostra o filtro de status se não for fixo
            <select
                value={currentStatusFilter}
                onChange={(e) => setCurrentStatusFilter(e.target.value as NewsStatus | 'all')}
                className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500"
            >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
            </select>
        )}
      </div>

      {loading && <div className="text-center p-4"><i className="fas fa-spinner fa-spin text-green-500 mr-2"></i>Carregando...</div>}
      {error && <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>}
      
      {!loading && !error && (
        <>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-green-300 uppercase bg-black/40">
                <tr>
                <th scope="col" className="px-4 py-3">ID</th>
                <th scope="col" className="px-4 py-3">Título / Prompt</th>
                <th scope="col" className="px-4 py-3">Tipo</th>
                <th scope="col" className="px-4 py-3">Autor</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                {news.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                            Nenhum conteúdo gerado encontrado.
                        </td>
                    </tr>
                ) : (
                    news.map(article => (
                    <tr key={article.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-500">{article.id}</td>
                        <td className="px-4 py-3 font-medium text-white max-w-xs truncate">{article.titulo}</td>
                        <td className="px-4 py-3 text-gray-400">{getTypeName(article.tipo)}</td>
                        <td className="px-4 py-3 text-gray-400">{article.author?.email || 'Sistema'}</td>
                        <td className="px-4 py-3 text-center">
                            {article.status && getStatusChip(article.status)}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button 
                                onClick={() => setViewingArticle(article)}
                                className="font-medium text-blue-400 hover:underline"
                            >
                                Ver
                            </button>
                            <button 
                                onClick={() => onEdit(article)}
                                className="font-medium text-yellow-400 hover:underline"
                            >
                                Editar
                            </button>
                            {article.status !== 'approved' && (
                                <button 
                                    onClick={() => handleStatusChange(article.id!, 'approved')}
                                    className="font-medium text-green-500 hover:underline"
                                >
                                    Aprovar
                                </button>
                            )}
                             {article.status !== 'rejected' && (
                                <button 
                                    onClick={() => handleStatusChange(article.id!, 'rejected')}
                                    className="font-medium text-red-500 hover:underline"
                                >
                                    Rejeitar
                                </button>
                            )}
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {viewingArticle && (
          <NewsViewModal article={viewingArticle} onClose={() => setViewingArticle(null)} />
      )}
    </div>
  );
}