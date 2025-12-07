
import React from 'react';
import { AdminView } from '../../types';

interface SidebarProps {
  currentView: AdminView;
  setCurrentView: React.Dispatch<React.SetStateAction<AdminView>>;
}

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const navItems: { key: AdminView; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { key: 'users', label: 'Usuários', icon: 'fas fa-users-cog' },
    { key: 'notifications_push', label: 'Notificações Push', icon: 'fas fa-paper-plane' }, // NOVO
    { key: 'news', label: 'Histórico', icon: 'fas fa-newspaper' },
    { key: 'payments', label: 'Pagamentos', icon: 'fas fa-credit-card' },
    { key: 'plans', label: 'Planos', icon: 'fas fa-layer-group' },
    { key: 'popups', label: 'Popups & Avisos', icon: 'fas fa-bullhorn' },
    { key: 'feedbacks', label: 'Depoimentos', icon: 'fas fa-comment-dots' },
    { key: 'multi_ia_system', label: 'Sistema Multi-IA', icon: 'fas fa-brain' },
    { key: 'security', label: 'Segurança', icon: 'fas fa-shield-alt' },
    { key: 'logs', label: 'Logs', icon: 'fas fa-clipboard-list' },
    { key: 'docs', label: 'Documentação', icon: 'fas fa-book' }, 
  ];

  const linkClasses = (view: AdminView) =>
    `w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 flex items-center text-sm font-medium ${
      currentView === view
        ? 'bg-[#263238] text-white shadow-md'
        : 'text-[#263238] hover:bg-[#ECEFF1] hover:text-[#263238]'
    }`;

  return (
    <aside className="w-full md:w-64 bg-[#CFD8DC] border-r border-gray-300 p-4 flex-shrink-0 min-h-screen">
      <nav>
        <ul className="space-y-1">
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
