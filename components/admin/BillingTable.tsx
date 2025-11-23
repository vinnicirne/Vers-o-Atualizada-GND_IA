import React, { useState, useEffect, useCallback } from 'react';
import { getTransactions, getApprovedRevenueInRange } from '../../services/adminService';
import { Transaction, TransactionStatus, PaymentMethod } from '../../types';
import { Pagination } from './Pagination';
import { Toast } from './Toast';

const TRANSACTIONS_PER_PAGE = 15;

export const BillingTable: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [approvedTotal, setApprovedTotal] = useState(0);
    
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        status: 'all' as TransactionStatus | 'all',
        method: 'all' as PaymentMethod | 'all',
        startDate: '',
        endDate: '',
    });
    
    const [appliedFilters, setAppliedFilters] = useState(filters);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [transactionsData, totalData] = await Promise.all([
                getTransactions({
                    page: currentPage,
                    limit: TRANSACTIONS_PER_PAGE,
                    status: appliedFilters.status,
                    method: appliedFilters.method,
                    startDate: appliedFilters.startDate,
                    endDate: appliedFilters.endDate
                }),
                getApprovedRevenueInRange(appliedFilters.startDate, appliedFilters.endDate)
            ]);
            
            setTransactions(transactionsData.transactions);
            setTotalTransactions(transactionsData.count);
            setApprovedTotal(totalData);

        } catch (error: any) {
            setToast({ message: error.message || 'Falha ao buscar transações.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, appliedFilters]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        setAppliedFilters(filters);
    };

    const handleResetFilters = () => {
        const initialFilters = { status: 'all' as const, method: 'all' as const, startDate: '', endDate: '' };
        setFilters(initialFilters);
        if (JSON.stringify(appliedFilters) !== JSON.stringify(initialFilters)) {
            setCurrentPage(1);
            setAppliedFilters(initialFilters);
        }
    };
    
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getStatusChip = (status: TransactionStatus) => {
        const styles = {
            approved: 'bg-green-900/50 text-green-300',
            pending: 'bg-yellow-900/50 text-yellow-400',
            failed: 'bg-red-900/50 text-red-400',
        };
        return <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${styles[status]}`}>{status}</span>;
    };

    const getMethodChip = (method: PaymentMethod) => {
        const styles = {
            pix: 'bg-sky-900/50 text-sky-300',
            card: 'bg-purple-900/50 text-purple-300',
        };
        const icon = method === 'pix' ? 'fa-qrcode' : 'fa-credit-card';
        return <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${styles[method]}`}><i className={`fas ${icon} mr-1.5`}></i>{method}</span>;
    };

    const totalPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Summary Card */}
            <div className="bg-black/50 border border-green-900/40 rounded-lg p-6 flex items-center space-x-4 shadow-lg shadow-black/30">
                <div className="bg-green-900/20 p-4 rounded-full">
                    <i className="fas fa-wallet text-2xl text-green-400"></i>
                </div>
                <div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider">Faturamento Aprovado no Período</p>
                    <p className="text-3xl font-bold text-gray-100">{formatCurrency(approvedTotal)}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
                <h2 className="text-2xl font-bold text-green-400 mb-4">Relatório de Transações</h2>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b border-green-900/20">
                    <div>
                        <label className="text-xs text-gray-400">Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full mt-1 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5">
                            <option value="all">Todos</option>
                            <option value="approved">Aprovado</option>
                            <option value="pending">Pendente</option>
                            <option value="failed">Falhou</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs text-gray-400">Método</label>
                        <select name="method" value={filters.method} onChange={handleFilterChange} className="w-full mt-1 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5">
                            <option value="all">Todos</option>
                            <option value="pix">Pix</option>
                            <option value="card">Cartão</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs text-gray-400">Data Início</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full mt-1 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5"/>
                    </div>
                     <div>
                        <label className="text-xs text-gray-400">Data Fim</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full mt-1 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5"/>
                    </div>
                    <div className="lg:col-span-4 flex justify-end items-center gap-3">
                         <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition">Limpar</button>
                         <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition">Aplicar Filtros</button>
                    </div>
                </div>

                {/* Table */}
                {loading ? <div className="text-center p-8"> <i className="fas fa-spinner fa-spin text-2xl text-green-400"></i> <p className="mt-2">Carregando transações...</p></div> : (
                    transactions.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-green-300 uppercase bg-black/40">
                                        <tr>
                                            <th className="px-4 py-3">ID Transação</th>
                                            <th className="px-4 py-3">Usuário</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                            <th className="px-4 py-3 text-center">Método</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                                                <td className="px-4 py-3 font-mono text-gray-500">{tx.id}</td>
                                                <td className="px-4 py-3">{tx.user?.email || 'N/A'}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(tx.valor)}</td>
                                                <td className="px-4 py-3 text-center">{getMethodChip(tx.metodo)}</td>
                                                <td className="px-4 py-3 text-center">{getStatusChip(tx.status)}</td>
                                                <td className="px-4 py-3">{new Date(tx.data).toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <i className="fas fa-search-dollar text-4xl text-gray-600 mb-3"></i>
                            <h3 className="text-lg font-bold text-gray-400">Nenhuma Transação Encontrada</h3>
                            <p className="text-sm text-gray-500">Tente ajustar os filtros ou verificar mais tarde.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};