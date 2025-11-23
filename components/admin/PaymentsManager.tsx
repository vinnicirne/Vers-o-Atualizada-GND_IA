import React, { useState } from 'react';
import { BillingTable } from './BillingTable';
import { PaymentsConfig } from './PaymentsConfig';

type ActiveTab = 'billing' | 'config';

export const PaymentsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('billing');

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
          <button onClick={() => setActiveTab('billing')} className={tabClasses('billing')}>
            <i className="fas fa-file-invoice-dollar mr-2"></i>
            Relatório de Transações
          </button>
          <button onClick={() => setActiveTab('config')} className={tabClasses('config')}>
            <i className="fas fa-cogs mr-2"></i>
            Configurações
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'billing' && <BillingTable />}
        {activeTab === 'config' && <PaymentsConfig />}
      </div>
    </div>
  );
};