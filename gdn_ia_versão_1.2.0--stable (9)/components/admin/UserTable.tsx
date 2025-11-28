
import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUser, deleteUser } from '../../services/adminService';
import { User, UserRole, UserStatus } from '../../types';
import { Pagination } from './Pagination';
import { UserEditModal } from './UserEditModal';
import { useUser } from '../../contexts/UserContext'; 
import { Toast } from './Toast';

const USERS_PER_PAGE = 10;

interface UserTableProps {
  dataVersion: number;
}

export function UserTable({ dataVersion }: UserTableProps) {
  const { user: adminUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // State para Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // State para Exclusão (Modal Customizado em vez de window.confirm)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { users: userList, count } = await getUsers({ 
          page: currentPage, 
          limit: USERS_PER_PAGE,
          role: roleFilter,
          status: statusFilter,
      });
      setUsers(userList);
      setTotalUsers(count);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, dataVersion]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  // Abre o modal de confirmação
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  // Executa a exclusão real
  const confirmDelete = async () => {
    if (!adminUser || !userToDelete) return;

    try {
        setIsDeleting(true);
        await deleteUser(userToDelete.id, adminUser.id);
        setToast({ message: "Usuário excluído com sucesso!", type: 'success' });
        // Fecha modal
        setUserToDelete(null);
        // Pequeno delay para garantir que o banco processou antes de recarregar
        setTimeout(() => fetchUsers(), 500);
    } catch (err: any) {
        console.error("Erro no frontend ao excluir:", err);
        let msg = err.message || "Erro ao excluir usuário.";
        if (msg.includes("foreign key")) {
            msg = "Erro de integridade (Foreign Key). O usuário possui dados que não puderam ser apagados automaticamente.";
        }
        setToast({ message: msg, type: 'error' });
        setUserToDelete(null); // Fecha modal mesmo com erro
    } finally {
        setIsDeleting(false);
    }
  };
  
  const handleCloseEditModal = () => {
    setSelectedUser(null);
    setIsEditModalOpen(false);
  };
  
  const handleSaveUser = async (userId: string, updates: { role: UserRole; credits: number; status: UserStatus; full_name: string }) => {
    if (!adminUser) {
        setError("Sessão de administrador inválida.");
        return;
    }
    try {
        setIsSaving(true);
        await updateUser(userId, updates, adminUser.id);
        setToast({ message: "Usuário atualizado com sucesso!", type: 'success' });
        handleCloseEditModal();
        await fetchUsers(); 
    } catch (err: any) {
        setToast({ message: err.message || "Falha ao atualizar o usuário.", type: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  
  const getStatusChip = (status?: UserStatus) => {
    const baseClasses = "px-2 py-0.5 text-xs font-bold rounded-full capitalize";
    switch(status) {
        case 'active': return `${baseClasses} bg-green-900/50 text-green-300`;
        case 'inactive': return `${baseClasses} bg-yellow-900/50 text-yellow-400`;
        case 'banned': return `${baseClasses} bg-red-900/50 text-red-400`;
        default: return `${baseClasses} bg-gray-800/50 text-gray-400`;
    }
  };

  return (
    <>
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-green-400 whitespace-nowrap">Gerenciamento de Usuários</h2>
        <div className="flex items-center space-x-4">
            <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500"
            >
                <option value="all">Todas as Roles</option>
                <option value="user">User</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
            </select>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
                className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500"
            >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="banned">Banido</option>
            </select>
        </div>
      </div>

      {loading && <div className="text-center p-4"><i className="fas fa-spinner fa-spin text-green-500 mr-2"></i>Carregando...</div>}
      {error && <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md"><strong>Erro:</strong> {error}</div>}
      
      {!loading && !error && (
        <>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-green-300 uppercase bg-black/40">
                <tr>
                <th scope="col" className="px-6 py-3">Usuário</th>
                <th scope="col" className="px-6 py-3">Role</th>
                <th scope="col" className="px-6 py-3 text-center">Créditos</th>
                <th scope="col" className="px-6 py-3 text-center">Status</th>
                <th scope="col" className="px-6 py-3 text-center" title="Data do último login">Último Login</th>
                <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                <tr key={user.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-white">{user.full_name || user.email}</div>
                        {user.full_name && <div className="text-xs text-gray-400">{user.email}</div>}
                    </td>
                    <td className="px-6 py-4 capitalize">{user.role.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-center font-mono">
                        {user.credits === -1 ? <span className="text-lg text-green-400">∞</span> : user.credits}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={getStatusChip(user.status)}>{user.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-400" title={user.last_login ? new Date(user.last_login).toLocaleString() : ''}>
                        {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                        <button 
                            onClick={() => handleEditClick(user)}
                            className="font-medium text-yellow-400 hover:underline disabled:opacity-50"
                            disabled={isDeleting}
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => handleDeleteClick(user)}
                            className="font-medium text-red-500 hover:underline disabled:opacity-50"
                            disabled={isDeleting}
                        >
                            Excluir
                        </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
    
    {isEditModalOpen && selectedUser && (
        <UserEditModal 
            user={selectedUser}
            onClose={handleCloseEditModal}
            onSave={handleSaveUser}
            isSaving={isSaving}
        />
    )}

    {/* Modal de Confirmação de Exclusão Customizado */}
    {userToDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-black rounded-lg shadow-xl w-full max-w-md border border-red-500/50">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Excluir Usuário?</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Você está prestes a excluir <strong>{userToDelete.email}</strong>.
                        <br/><br/>
                        Isso removerá permanentemente o acesso e todos os dados associados (créditos, logs, histórico). Esta ação não pode ser desfeita.
                    </p>
                    
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => setUserToDelete(null)}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition border border-gray-700"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center"
                        >
                            {isDeleting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Excluindo...</> : 'Sim, Excluir'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}

    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};
