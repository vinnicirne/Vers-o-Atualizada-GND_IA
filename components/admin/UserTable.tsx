import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUser } from '../../services/adminService';
import { User, UserRole, UserStatus } from '../../types';
import { Pagination } from './Pagination';
import { UserEditModal } from './UserEditModal';
import { useUser } from '../../contexts/UserContext'; // To get admin ID

const USERS_PER_PAGE = 10;

interface UserTableProps {
  dataVersion: number;
}

export const UserTable: React.FC<UserTableProps> = ({ dataVersion }) => {
  const { user: adminUser } = useUser(); // The logged-in admin
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // State for filtering and pagination
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
  
  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsEditModalOpen(false);
  };
  
  const handleSaveUser = async (userId: string, updates: { role: UserRole; credits: number; }) => {
    if (!adminUser) {
        setError("Sessão de administrador inválida.");
        return;
    }
    try {
        setIsSaving(true);
        await updateUser(userId, updates, adminUser.id);
        handleCloseModal();
        await fetchUsers(); // Refresh data
    } catch (err: any) {
        setError(err.message || "Falha ao atualizar o usuário.");
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
           {/* Filters */}
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

      {loading && <div className="text-center p-4">Carregando usuários...</div>}
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
                    <td className="px-6 py-4 text-right">
                        <button 
                            onClick={() => handleEditClick(user)}
                            className="font-medium text-yellow-400 hover:underline"
                        >
                            Editar
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
            onClose={handleCloseModal}
            onSave={handleSaveUser}
            isSaving={isSaving}
        />
    )}
    </>
  );
};