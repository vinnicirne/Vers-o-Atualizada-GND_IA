import { api } from './api';

export interface UserFeedback {
  rating: number;
  comment: string;
  newsId?: number;
}

export const saveUserFeedback = async (userId: string, feedback: UserFeedback) => {
  try {
    let prefixoAprendizado = "";
    
    if (feedback.rating >= 8) {
        prefixoAprendizado = "✅ [PADRÃO DE SUCESSO - REPLICAR]: O usuário AMOU este resultado. ";
    } else if (feedback.rating <= 4) {
        prefixoAprendizado = "❌ [PADRÃO DE ERRO - EVITAR]: O usuário DETESTOU este resultado. ";
    } else {
        prefixoAprendizado = "ℹ️ [AJUSTE FINO]: Feedback neutro/construtivo. ";
    }

    const valorMemoria = `${prefixoAprendizado} Nota: ${feedback.rating}/10. Comentário: "${feedback.comment}"`;

    const { error } = await api.insert('user_memory', { 
        user_id: userId, 
        chave: feedback.rating >= 8 ? 'feedback_positivo_landing' : 'feedback_ajuste', 
        valor: valorMemoria 
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao salvar feedback via Proxy:', error);
    return false;
  }
};

export const getUserPreferences = async (userId: string): Promise<string> => {
  try {
    // API Proxy select não suporta ordenação/limit nativo no payload simples
    // Buscamos tudo e filtramos no cliente
    const { data, error } = await api.select('user_memory', { user_id: userId });

    if (error) throw error;
    if (!data || data.length === 0) return '';

    // Ordenar e pegar os 10 últimos
    const sortedMemoria = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    return sortedMemoria.map((m: any) => `${m.valor}`).join('\n');
  } catch (error) {
    console.error('Erro ao buscar preferências:', error);
    return '';
  }
};

export const saveGenerationResult = async (userId: string, resultText: string) => {
  try {
    const { error } = await api.insert('user_memory', {
      user_id: userId,
      chave: 'ultimo_resultado_gerado',
      valor: resultText.substring(0, 1000)
    });
    if (error) console.error('Erro API ao salvar memória:', error);
  } catch (err) {
    console.error('Erro ao salvar resultado:', err);
  }
};
