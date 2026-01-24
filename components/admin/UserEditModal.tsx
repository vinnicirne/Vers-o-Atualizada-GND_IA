
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../../types';
import { usePlans } from '../../hooks/usePlans';

interface UserEditModalProps {
  user: User;
  onSave: (userId: string, updates: { role: UserRole, credits: number, status: UserStatus, full_name: string, plan: string }) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function UserEditModal({ user, onSave, onClose, isSaving }: UserEditModalProps) {
  const { allPlans } = usePlans();
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status || 'active');
  const [fullName, setFullName] = useState(user.full_name || '');
  const [plan, setPlan] = useState<string>(user.plan || 'free');
  const [credits, setCredits] = useState<string>(String(user.credits === -1 ? 0 : user.credits));

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newPlanId = e.target.value;
      setPlan(newPlanId);
      
      // Auto-update credits based on plan defaults if not admin
      if (role !== 'admin' && role !== 'super_admin') {
          const selected = allPlans.find(p => p.id === newPlanId);
          if (selected) {
              setCredits(String(selected.credits === -1 ? 0 : selected.credits));
          }
      }
  };

  const handleSave = () => {
    const newCredits = parseInt(credits, 10);
    if (isNaN(newCredits)) {
        alert("Valor de crédito inválido.");
        return;
    }
    
    // Admins e super admins têm créditos ilimitados, representados por -1.
    const finalCredits = (role === 'admin' || role === 'super_admin') ? -1 : newCredits;

    onSave(user.id, { role, credits: finalCredits, status, full_name: fullName, plan });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-200">
        <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-bold text-[#263238]">Editar Usuário</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="p-6 space-y-4">
           <div>
            <label htmlFor="fullName" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
              Nome Completo
            </label>
            <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
              Status da Conta
            </label>
            <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
                <option value="active">Ativo (Acesso Liberado)</option>
                <option value="inactive">Inativo (Acesso Bloqueado)</option>
                <option value="banned">Banido (Suspenso)</option>
            </select>
          </div>
          <div>
            <label htmlFor="role" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
              Role
            </label>
            <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
                <option value="user">User</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="plan" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
              Plano Atual
            </label>
            <select
                id="plan"
                value={plan}
                onChange={handlePlanChange}
                className="w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
                {allPlans.length > 0 ? (
                    allPlans.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.credits === -1 ? '∞' : p.credits} créditos) {!p.isActive ? ' [PERSONALIZADO]' : ''}
                        </option>
                    ))
                ) : (
                    <>
                        <option value="free">Free</option>
                        <option value="basic">Básico</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                    </>
                )}
            </select>
          </div>
          <div>
            <label htmlFor="credits" className="block text-xs uppercase font-bold mb-2 tracking-wider text-gray-500">
              Créditos
            </label>
            {(role === 'admin' || role === 'super_admin') ? (
                 <p className="p-3 text-lg font-bold text-green-600 bg-green-50 rounded border border-green-100">∞ Ilimitado</p>
            ) : (
                <input
                    id="credits"
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-700 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
            )}
          </div>
        </div>
        <div className="p-6 bg-gray-50 flex justify-end space-x-4 rounded-b-lg border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
