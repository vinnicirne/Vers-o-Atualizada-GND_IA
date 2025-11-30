
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
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
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
        <h2 className="text-2xl font-bold text-[#263238] whitespace-nowrap">Histórico de Conteúdo</h2>
        {initialStatusFilter === 'all' && ( // Só mostra o filtro de status se não for fixo
            <select
                value={currentStatusFilter}
                onChange={(e) => setCurrentStatusFilter(e.target.value as NewsStatus | 'all')}
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
            >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
            </select>
        )}
      </div>

      {loading && <div className="text-center p-4 text-gray-500"><i className="fas fa-spinner fa-spin text-green-600 mr-2"></i>Carregando...</div>}
      {error && <div className="text-center p-4 text-red-600 bg-red-50 border-red-200 rounded-md"><strong>Erro:</strong> {error}</div>}
      
      {!loading && !error && (
        <>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                <th scope="col" className="px-4 py-3 font-semibold">ID</th>
                <th scope="col" className="px-4 py-3 font-semibold">Título / Prompt</th>
                <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                <th scope="col" className="px-4 py-3 font-semibold">Autor</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Ações</th>
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
                    <tr key={article.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-500">{article.id}</td>
                        <td className="px-4 py-3 font-medium text-[#263238] max-w-xs truncate">{article.titulo}</td>
                        <td className="px-4 py-3 text-gray-500">{getTypeName(article.tipo)}</td>
                        <td className="px-4 py-3 text-gray-500">{article.author?.email || 'Sistema'}</td>
                        <td className="px-4 py-3 text-center">
                            {article.status && getStatusChip(article.status)}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button 
                                onClick={() => setViewingArticle(article)}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                Ver
                            </button>
                            <button 
                                onClick={() => onEdit(article)}
                                className="font-medium text-yellow-600 hover:text-yellow-700 hover:underline"
                            >
                                Editar
                            </button>
                            {article.status !== 'approved' && (
                                <button 
                                    onClick={() => handleStatusChange(article.id!, 'approved')}
                                    className="font-medium text-green-600 hover:text-green-800 hover:underline"
                                >
                                    Aprovar
                                </button>
                            )}
                             {article.status !== 'rejected' && (
                                <button 
                                    onClick={() => handleStatusChange(article.id!, 'rejected')}
                                    className="font-medium text-red-600 hover:text-red-800 hover:underline"
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
