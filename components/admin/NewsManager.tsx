
import React from 'react';
import { NewsTable } from './NewsTable';
import { NewsArticle } from '../../types';

interface NewsManagerProps {
    onEdit: (article: NewsArticle) => void;
    dataVersion: number;
}

export function NewsManager({ onEdit, dataVersion }: NewsManagerProps) {
    return (
        <div className="space-y-6">
            <div className="border-b border-green-900/30 pb-4 mb-6">
                <h2 className="text-xl font-bold text-green-400 flex items-center">
                    <i className="fas fa-history mr-3"></i>
                    Histórico de Notícias
                </h2>
                <p className="text-sm text-gray-500 mt-1 ml-1">
                    Visualize e gerencie todas as notícias geradas pela plataforma.
                </p>
            </div>

            {/* Renderiza a tabela diretamente com filtro 'all' para mostrar tudo */}
            <NewsTable onEdit={onEdit} dataVersion={dataVersion} statusFilter='all' />
        </div>
    );
}
