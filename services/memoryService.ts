
import { supabase } from './supabaseClient';

export interface UserFeedback {
  rating: number;
  comment: string;
  newsId?: number;
}

export const saveUserFeedback = async (userId: string, feedback: UserFeedback) => {
  try {
    // CLASSIFICAÇÃO DE APRENDIZADO
    // Transforma o feedback numérico em instrução semântica para a IA
    let prefixoAprendizado = "";
    
    if (feedback.rating >= 8) {
        prefixoAprendizado = "✅ [PADRÃO DE SUCESSO - REPLICAR]: O usuário AMOU este resultado. ";
    } else if (feedback.rating <= 4) {
        prefixoAprendizado = "❌ [PADRÃO DE ERRO - EVITAR]: O usuário DETESTOU este resultado. ";
    } else {
        prefixoAprendizado = "ℹ️ [AJUSTE FINO]: Feedback neutro/construtivo. ";
    }

    const valorMemoria = `${prefixoAprendizado} Nota: ${feedback.rating}/10. Comentário: "${feedback.comment}"`;

    // Salva o feedback na tabela de memória para influenciar o futuro
    const { error } = await supabase.from('user_memory').insert([
      { 
        user_id: userId, 
        chave: feedback.rating >= 8 ? 'feedback_positivo_landing' : 'feedback_ajuste', 
        valor: valorMemoria 
      }
    ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao salvar feedback:', error);
    return false;
  }
};

export const getUserPreferences = async (userId: string): Promise<string> => {
  try {
    const { data: memoria, error } = await supabase
      .from('user_memory')
      .select('chave,valor')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // AUMENTADO PARA 10: Mais contexto para a IA aprender

    if (error) throw error;

    if (!memoria || memoria.length === 0) return '';

    // Formata a memória como um bloco de instruções claras
    return memoria.map(m => `${m.valor}`).join('\n');
  } catch (error) {
    console.error('Erro ao buscar preferências:', error);
    return '';
  }
};

export const saveGenerationResult = async (userId: string, resultText: string) => {
  try {
    const { error } = await supabase.from('user_memory').insert({
      user_id: userId,
      chave: 'ultimo_resultado_gerado',
      valor: resultText.substring(0, 1000) // Salva um trecho para contexto (menor para economizar tokens)
    });
    if (error) console.error('Erro ao salvar memória de resultado:', error);
  } catch (err) {
    console.error('Erro ao salvar resultado:', err);
  }
};
