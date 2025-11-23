import React, { useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useAccessLog } from '../../hooks/useAccessLog';

interface AdminGateProps {
  onAccessDenied: () => void;
  children: React.ReactNode;
}

export const AdminGate: React.FC<AdminGateProps> = ({ onAccessDenied, children }) => {
  const { user, loading } = useUser();
  const { logAccessAttempt } = useAccessLog();
  const isAuthorized = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (loading) {
      return; // Aguardar o término do carregamento
    }

    if (!isAuthorized) {
        const reason = user 
            ? `Acesso admin negado para role '${user.role}'`
            : 'Tentativa de acesso admin sem autenticação';
        
        logAccessAttempt(user?.id, reason);
        console.log(`[AdminGate] ${reason}. Redirecionando...`);
        onAccessDenied();
    }
  }, [user, loading, onAccessDenied, logAccessAttempt, isAuthorized]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-green-400 animate-pulse">Carregando sessão...</p>
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }
  
  // Renderiza uma mensagem enquanto o redirecionamento (mudança de estado no pai) acontece.
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-red-400">Acesso negado. Redirecionando para o dashboard...</p>
    </div>
  );
};
