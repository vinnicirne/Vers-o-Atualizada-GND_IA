
import { supabase } from './supabaseClient';

export interface UserFeedback {
  rating: number;
  comment: string;
  newsId?: number;
}

export const saveUserFeedback = async (userId: string, feedback: UserFeedback) => {
  try {
    // Salva o feedback na tabela de memória para influenciar o futuro
    const { error } = await supabase.from('user_memory').insert([
      { 
        user_id: userId, 
        chave: 'ultimo_feedback', 
        valor: JSON.stringify(feedback) 
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
      .limit(5); // Pega os 5 registros mais recentes de memória

    if (error) throw error;

    if (!memoria || memoria.length === 0) return '';

    return memoria.map(m => `[Memória passada - ${m.chave}]: ${m.valor}`).join('\n');
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
      valor: resultText.substring(0, 2000) // Limita o tamanho para economizar banco
    });
    if (error) console.error('Erro ao salvar memória de resultado:', error);
  } catch (err) {
    console.error('Erro ao salvar resultado:', err);
  }
};
