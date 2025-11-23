import React from 'react';
import { AdminView } from '../../types';

interface SidebarProps {
  currentView: AdminView;
  setCurrentView: React.Dispatch<React.SetStateAction<AdminView>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems: { key: AdminView; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { key: 'users', label: 'Usuários', icon: 'fas fa-users-cog' },
    { key: 'news', label: 'Notícias', icon: 'fas fa-newspaper' },
    { key: 'payments', label: 'Pagamentos', icon: 'fas fa-credit-card' },
    { key: 'multi_ia_system', label: 'Sistema Multi-IA', icon: 'fas fa-brain' },
    { key: 'logs', label: 'Logs', icon: 'fas fa-clipboard-list' },
  ];

  const linkClasses = (view: AdminView) =>
    `w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 flex items-center ${
      currentView === view
        ? 'bg-green-600 text-black font-bold shadow-md shadow-green-600/20'
        : 'text-gray-400 hover:bg-gray-800/50 hover:text-green-400'
    }`;

  return (
    <aside className="w-full md:w-64 bg-black/30 border border-green-900/30 p-4 rounded-lg shadow-lg flex-shrink-0">
      <nav>
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.key}>
              <button
                onClick={() => setCurrentView(item.key)}
                className={linkClasses(item.key)}
                aria-current={currentView === item.key ? 'page' : undefined}
              >
                <i className={`${item.icon} mr-3 w-5 text-center`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};