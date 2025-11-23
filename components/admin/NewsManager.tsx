import React, { useState } from 'react';
import { NewsApprovalTable } from './NewsApprovalTable';
import { NewsTable } from './NewsTable';
import { NewsArticle } from '../../types';

interface NewsManagerProps {
    onEdit: (article: NewsArticle) => void;
    dataVersion: number;
}

type ActiveTab = 'pending' | 'history';

export const NewsManager: React.FC<NewsManagerProps> = ({ onEdit, dataVersion }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('pending');

    const tabClasses = (tabName: ActiveTab) =>
        `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors duration-200 focus:outline-none ${
        activeTab === tabName
            ? 'bg-black/30 border-b-2 border-green-500 text-green-400'
            : 'text-gray-500 hover:text-gray-300'
        }`;

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-green-900/30">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('pending')} className={tabClasses('pending')}>
                        <i className="fas fa-hourglass-half mr-2"></i>
                        Aprovação Pendente
                    </button>
                    <button onClick={() => setActiveTab('history')} className={tabClasses('history')}>
                        <i className="fas fa-history mr-2"></i>
                        Histórico Completo
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'pending' && <NewsApprovalTable onEdit={onEdit} dataVersion={dataVersion} />}
                {activeTab === 'history' && <NewsTable onEdit={onEdit} dataVersion={dataVersion} />}
            </div>
        </div>
    );
};