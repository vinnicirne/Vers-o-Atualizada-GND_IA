
import { api } from './api';
import { NewsArticle } from '../types';
import { supabase } from './supabaseClient';

export const getUserHistory = async (userId: string): Promise<NewsArticle[]> => {
  const { data, error } = await api.select('news', { author_id: userId });
  
  if (error) {
      console.error("Erro ao buscar histórico:", error);
      // Se a coluna author_id não existir, o erro será lançado aqui para ser tratado pelo componente.
      throw new Error(error);
  }
  
  // Ordena por data decrescente (mais recente primeiro)
  return (data || []).sort((a: any, b: any) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime());
};

export const cancelSubscription = async (subscriptionId: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('asaas-pagar', {
            body: {
                action: 'cancel_subscription',
                subscription_id: subscriptionId
            }
        });

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);

        return { success: true, message: data.message };
    } catch (e: any) {
        console.error("Erro ao cancelar assinatura:", e);
        return { success: false, message: e.message || 'Erro desconhecido ao cancelar assinatura.' };
    }
};
