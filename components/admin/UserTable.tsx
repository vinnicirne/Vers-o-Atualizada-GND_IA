
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
        case 'active': return `${baseClasses} bg-green-100 text-green-700`;
        case 'inactive': return `${baseClasses} bg-yellow-100 text-yellow-700`;
        case 'banned': return `${baseClasses} bg-red-100 text-red-700`;
        default: return `${baseClasses} bg-gray-100 text-gray-500`;
    }
  };

  return (
    <>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-[#263238] whitespace-nowrap">Gerenciamento de Usuários</h2>
        <div className="flex items-center space-x-4">
            <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
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
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
            >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="banned">Banido</option>
            </select>
        </div>
      </div>

      {loading && <div className="text-center p-4 text-gray-500"><i className="fas fa-spinner fa-spin text-green-600 mr-2"></i>Carregando...</div>}
      {error && <div className="text-center p-4 text-red-600 bg-red-50 border-red-200 rounded-md"><strong>Erro:</strong> {error}</div>}
      
      {!loading && !error && (
        <>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Usuário</th>
                <th scope="col" className="px-6 py-3 font-semibold">Role</th>
                <th scope="col" className="px-6 py-3 text-center font-semibold">Créditos</th>
                <th scope="col" className="px-6 py-3 text-center font-semibold">Status</th>
                <th scope="col" className="px-6 py-3 text-center font-semibold" title="Data do último login">Último Login</th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">Ações</th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                <tr key={user.id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-[#263238]">{user.full_name || user.email}</div>
                        {user.full_name && <div className="text-xs text-gray-500">{user.email}</div>}
                    </td>
                    <td className="px-6 py-4 capitalize">{user.role.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-center font-mono text-gray-700">
                        {user.credits === -1 ? <span className="text-lg text-green-600">∞</span> : user.credits}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={getStatusChip(user.status)}>{user.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-500" title={user.last_login ? new Date(user.last_login).toLocaleString() : ''}>
                        {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                        <button 
                            onClick={() => handleEditClick(user)}
                            className="font-medium text-yellow-600 hover:text-yellow-700 hover:underline disabled:opacity-50"
                            disabled={isDeleting}
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => handleDeleteClick(user)}
                            className="font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-red-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                    </div>
                    <h3 className="text-xl font-bold text-[#263238] mb-2">Excluir Usuário?</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Você está prestes a excluir <strong>{userToDelete.email}</strong>.
                        <br/><br/>
                        Isso removerá permanentemente o acesso e todos os dados associados (créditos, logs, histórico). Esta ação não pode ser desfeita.
                    </p>
                    
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => setUserToDelete(null)}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition border border-gray-300"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center shadow-md shadow-red-200"
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
