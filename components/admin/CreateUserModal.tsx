import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { CreateUserPayload } from '../../services/adminService';

interface CreateUserModalProps {
  onSave: (payload: CreateUserPayload) => Promise<void>;
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ onSave, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [credits, setCredits] = useState('10');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    setError(null);
    if (!fullName.trim() || !email || !password) {
      setError("Nome, email e senha são obrigatórios.");
      return;
    }
    const newCredits = parseInt(credits, 10);
    if (isNaN(newCredits) || newCredits < 0) {
      setError("O valor dos créditos é inválido.");
      return;
    }
    
    setIsSaving(true);
    await onSave({
      email,
      password,
      full_name: fullName,
      role,
      credits: (role === 'admin' || role === 'super_admin') ? -1 : newCredits,
    });
    // The parent component will handle closing the modal on success
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black rounded-lg shadow-xl w-full max-w-lg border border-green-500/30">
        <div className="p-6 border-b border-green-900/30">
          <h2 className="text-xl font-bold text-green-400">Criar Novo Usuário</h2>
        </div>
        <div className="p-6 space-y-4">
            {error && <div className="p-3 text-xs rounded-md border bg-red-900/20 border-red-500/30 text-red-400">{error}</div>}
          <div>
            <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0"
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">Senha</label>
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border-2 border-green-900/60 text-gray-200 p-3 text-sm rounded-md focus:border-green-500 focus:outline-none focus:ring-0 pr-10"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white">
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">Role</label>
            <select
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
            <label className="block text-xs uppercase font-bold mb-2 tracking-wider text-green-400">Créditos</label>
            {(role === 'admin' || role === 'super_admin') ? (
              <p className="p-3 text-lg font-bold text-green-400">∞ Ilimitado</p>
            ) : (
              <input
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
            {isSaving ? 'Salvando...' : 'Salvar Usuário'}
          </button>
        </div>
      </div>
    </div>
  );
};