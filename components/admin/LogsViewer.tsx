import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getLogs } from '../../services/adminService';
import { Log } from '../../types';
import { Pagination } from './Pagination';
import { LogDetailsModal } from './LogDetailsModal';

const LOGS_PER_PAGE = 20;

const ACTION_OPTIONS = [
    'create_user', 'update_user', 'generated_current_news', 'generated_predictive_news', 
    'update_news_status', 'update_news_content', 'update_payment_settings', 
    'update_multi_ai_settings', 'Acesso admin negado para role'
];

const MODULE_OPTIONS = ['Usuários', 'Notícias', 'Pagamentos', 'Sistema Multi-IA', 'Sistema'];

export const LogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const [filters, setFilters] = useState({
    module: 'all',
    action: 'all',
    searchText: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { logs: logList, count } = await getLogs({
          page: currentPage,
          limit: LOGS_PER_PAGE,
          module: appliedFilters.module,
          action: appliedFilters.action,
          searchText: appliedFilters.searchText,
      });
      setLogs(logList);
      setTotalLogs(count);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar logs.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters(filters);
  };
  
  const handleResetFilters = () => {
    const initialFilters = { module: 'all', action: 'all', searchText: '' };
    setFilters(initialFilters);
    if(JSON.stringify(appliedFilters) !== JSON.stringify(initialFilters)) {
        setCurrentPage(1);
        setAppliedFilters(initialFilters);
    }
  };
  
  const handleExport = () => {
    alert('Funcionalidade de exportação CSV em desenvolvimento.');
  };

  const totalPages = Math.ceil(totalLogs / LOGS_PER_PAGE);

  return (
    <>
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-green-400">Logs de Auditoria do Sistema</h2>
        <button onClick={handleExport} className="px-4 py-2 text-sm font-bold text-green-300 bg-green-900/30 rounded-lg hover:bg-green-900/60 transition"><i className="fas fa-file-csv mr-2"></i>Exportar CSV</button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b border-green-900/20">
        <input type="text" placeholder="Buscar na ação..." value={filters.searchText} onChange={e => setFilters({...filters, searchText: e.target.value})} className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-2.5"/>
        <select value={filters.module} onChange={e => setFilters({...filters, module: e.target.value})} className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-2.5">
            <option value="all">Todos os Módulos</option>
            {MODULE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-2.5">
            <option value="all">Todas as Ações</option>
            {ACTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="flex justify-end gap-2">
            <button onClick={handleResetFilters} className="w-full md:w-auto px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition">Limpar</button>
            <button onClick={handleApplyFilters} className="w-full md:w-auto px-4 py-2 text-sm font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition">Filtrar</button>
        </div>
      </div>

      {loading && <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-2xl text-green-400"></i></div>}
      {error && <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>}
      
      {!loading && !error && (
        <>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-green-300 uppercase bg-black/40">
                <tr>
                    <th scope="col" className="px-4 py-3">Usuário</th>
                    <th scope="col" className="px-4 py-3">Ação</th>
                    <th scope="col" className="px-4 py-3">Módulo</th>
                    <th scope="col" className="px-4 py-3">Data/Hora</th>
                    <th scope="col" className="px-4 py-3 text-right">Detalhes</th>
                </tr>
            </thead>
            <tbody>
                {logs.map(log => (
                <tr key={log.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                    <td className="px-4 py-2">{log.user_email || 'Sistema'}</td>
                    <td className="px-4 py-2 font-medium">{log.acao}</td>
                    <td className="px-4 py-2">{log.modulo}</td>
                    <td className="px-4 py-2">{new Date(log.data).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2 text-right">
                        {log.detalhes && (
                             <button 
                                onClick={() => setSelectedLog(log)}
                                className="font-medium text-blue-400 hover:underline"
                            >
                                Ver Detalhes
                            </button>
                        )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        {logs.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum log encontrado para os filtros selecionados.</p>}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>

    {selectedLog && (
        <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    )}
    </>
  );
};