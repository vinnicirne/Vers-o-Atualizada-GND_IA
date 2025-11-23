import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';

interface UserEditModalProps {
  user: User;
  onSave: (userId: string, updates: { role: UserRole, credits: number }) => void;
  onClose: () => void;
  isSaving: boolean;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ user, onSave, onClose, isSaving }) => {
  const [role, setRole] = useState<UserRole>(user.role);
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

  const handleSave = () => {
    const newCredits = parseInt(credits, 10);
    if (isNaN(newCredits)) {
        alert("Valor de crédito inválido.");
        return;
    }
    
    // Admins e super admins têm créditos ilimitados, representados por -1.
    const finalCredits = (role === 'admin' || role === 'super_admin') ? -1 : newCredits;

    onSave(user.id, { role, credits: finalCredits });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black rounded-lg shadow-xl w-full max-w-lg border border-green-500/30">
        <div className="p-6 border-b border-green-900/30">
          <h2 className="text-xl font-bold text-green-400">Editar Usuário</h2>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="role" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
              Role
            </label>
            <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
            >
                <option value="user">User</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="credits" className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">
              Créditos
            </label>
            {(role === 'admin' || role === 'super_admin') ? (
                 <p className="p-3 text-lg font-bold text-green-400">∞ Ilimitado</p>
            ) : (
                <input
                    id="credits"
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
                />
            )}
          </div>
        </div>
        <div className="p-6 bg-black/50 flex justify-end space-x-4 rounded-b-lg border-t border-green-900/30">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
