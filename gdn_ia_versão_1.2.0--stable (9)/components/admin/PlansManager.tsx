
import React, { useState, useEffect } from 'react';
import { Plan } from '../../types/plan.types';
import { PlanForm } from './PlanForm';
import { usePlans } from '../../hooks/usePlans';
import { useUser } from '../../contexts/UserContext';
import { Toast } from './Toast';

export function PlansManager() {
  const { user: adminUser } = useUser();
  const { allPlans, loading, error, refreshPlans, updateAndSavePlans } = usePlans();
  
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fecha o formulário e reseta o plano de edição
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPlan(undefined);
  };

  // Abre o formulário para criar um novo plano
  const handleAddNewPlan = () => {
    setEditingPlan(undefined); // Garante que é um novo plano
    setIsFormOpen(true);
  };

  // Abre o formulário para editar um plano existente
  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  // Salva o plano no banco de dados
  const handleSavePlan = async (plan: Plan) => {
    if (!adminUser) {
      setToast({ message: "Sessão de administrador inválida.", type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      let updatedPlans: Plan[];
      if (editingPlan) {
        // Atualiza um plano existente
        updatedPlans = allPlans.map(p => p.id === plan.id ? plan : p);
      } else {
        // Adiciona um novo plano
        updatedPlans = [...allPlans, plan];
      }
      
      // Salva a lista completa de planos no banco de dados
      await updateAndSavePlans(updatedPlans, adminUser.id);
      setToast({ message: "Plano salvo com sucesso!", type: 'success' });
      handleCloseForm();
      refreshPlans(); // Recarrega a lista de planos para refletir as mudanças
    } catch (err: any) {
      setToast({ message: err.message || "Falha ao salvar o plano.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!adminUser) {
      setToast({ message: "Sessão de administrador inválida.", type: 'error' });
      return;
    }
    if (!window.confirm("Tem certeza que deseja DELETAR este plano? Isso pode afetar usuários existentes.")) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedPlans = allPlans.filter(p => p.id !== planId);
      await updateAndSavePlans(updatedPlans, adminUser.id);
      setToast({ message: "Plano removido com sucesso!", type: 'success' });
      refreshPlans();
    } catch (err: any) {
      setToast({ message: err.message || "Falha ao remover o plano.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Sincroniza os custos no banco de dados com os valores definidos no código
  const handleSyncCosts = async () => {
    if (!adminUser) return;
    if (!window.confirm("Isso atualizará os custos de crédito de todos os serviços no banco de dados para corresponder aos valores atuais do sistema (constants.ts). Deseja continuar?")) {
      return;
    }

    setIsSaving(true);
    try {
      // Ao chamar updateAndSavePlans com os planos atuais, o hook usePlans aplicará a lógica de syncPlanCosts antes de salvar
      await updateAndSavePlans(allPlans, adminUser.id);
      setToast({ message: "Custos sincronizados e salvos no banco de dados!", type: 'success' });
      refreshPlans();
    } catch (err: any) {
      setToast({ message: err.message || "Falha ao sincronizar custos.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <i className="fas fa-spinner fa-spin text-2xl text-green-400"></i>
        <p className="mt-2 text-gray-400">Carregando planos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-400 bg-red-900/20 border-red-500/30 rounded-md">
        <strong>Erro:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <h2 className="text-2xl font-bold text-green-400">Gerenciamento de Planos</h2>
          <div className="flex gap-3">
            <button
                onClick={handleSyncCosts}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-yellow-900 bg-yellow-500 rounded-lg hover:bg-yellow-400 transition-all shadow-md shadow-yellow-600/20 disabled:opacity-50"
                title="Forçar atualização dos preços no banco de dados"
            >
                <i className="fas fa-sync-alt mr-2"></i> Sincronizar Custos (DB)
            </button>
            {!isFormOpen && (
                <button
                onClick={handleAddNewPlan}
                className="px-4 py-2 text-sm font-bold text-black bg-green-600 rounded-lg hover:bg-green-500 transition-all shadow-md shadow-green-600/20"
                >
                <i className="fas fa-plus mr-2"></i> Adicionar Novo Plano
                </button>
            )}
          </div>
        </div>

        {isFormOpen ? (
          <PlanForm 
            initialData={editingPlan} 
            onSave={handleSavePlan} 
            isSaving={isSaving} 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-green-300 uppercase bg-black/40">
                <tr>
                  <th scope="col" className="px-6 py-3">ID</th>
                  <th scope="col" className="px-6 py-3">Nome</th>
                  <th scope="col" className="px-6 py-3 text-center">Créditos</th>
                  <th scope="col" className="px-6 py-3 text-right">Preço (R$)</th>
                  <th scope="col" className="px-6 py-3 text-center">Intervalo</th>
                  <th scope="col" className="px-6 py-3 text-center">Ativo</th>
                  <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {allPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhum plano configurado. Adicione um novo plano!
                    </td>
                  </tr>
                ) : (
                  allPlans.map((plan) => (
                    <tr key={plan.id} className="bg-gray-950/50 border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-400">{plan.id}</td>
                      <td className="px-6 py-4 font-semibold text-white">{plan.name}</td>
                      <td className="px-6 py-4 text-center">{plan.credits === -1 ? '∞' : plan.credits}</td>
                      <td className="px-6 py-4 text-right">{plan.price.toFixed(2).replace('.', ',')}</td>
                      <td className="px-6 py-4 text-center capitalize">{plan.interval === 'month' ? 'Mensal' : 'Anual'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${plan.isActive ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                          {plan.isActive ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleEditPlan(plan)}
                          className="font-medium text-yellow-400 hover:underline"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="font-medium text-red-500 hover:underline"
                          disabled={isSaving}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {isFormOpen && (
            <div className="flex justify-start mt-6 border-t border-green-900/30 pt-6">
                <button 
                    onClick={handleCloseForm}
                    className="px-4 py-2 font-bold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                    <i className="fas fa-arrow-left mr-2"></i> Voltar para a Lista
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
