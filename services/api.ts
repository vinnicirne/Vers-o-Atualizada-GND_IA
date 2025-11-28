
import { supabase } from './supabaseClient';

/**
 * Helper para retentar operações em caso de falha de rede
 */
const retryOperation = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<{ data: T | null; error: any }> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation();
      // Se não houver erro, retorna imediatamente
      if (!result.error) return result;

      // Se houver erro, verifica se é um erro de rede/fetch que vale a pena retentar
      const errorMsg = typeof result.error === 'string' 
        ? result.error 
        : (result.error.message || JSON.stringify(result.error));
      
      const isNetworkError = errorMsg.includes('Failed to fetch') || 
                             errorMsg.includes('Network request failed') ||
                             errorMsg.includes('connection error');

      // Se não for erro de rede ou for a última tentativa, retorna o erro
      if (!isNetworkError || i === maxRetries - 1) {
        return result;
      }

      // Espera antes de tentar novamente (Backoff exponencial)
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`[API] Tentativa ${i + 1} falhou. Retentando em ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (e: any) {
      // Se a execução da função em si falhar (exceção não tratada)
      if (i === maxRetries - 1) {
         return { data: null, error: e.message || String(e) };
      }
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
    }
  }
  return { data: null, error: 'Maximum retries reached' };
};

/**
 * API Service (Direct Connection)
 * Conecta diretamente ao Supabase usando o cliente oficial.
 */

export const api = {
  // Busca dados (SELECT) com suporte a filtros exatos e lista (IN)
  select: async (table: string, filters: Record<string, any> = {}, options: { inColumn?: string, inValues?: any[] } = {}) => {
    return retryOperation(async () => {
      try {
        let query = supabase.from(table).select('*');
        
        // Aplica filtros exatos (match)
        if (Object.keys(filters).length > 0) {
          query = query.match(filters);
        }

        // Aplica filtro IN (lista de valores) - Otimização de Performance
        if (options.inColumn && options.inValues && options.inValues.length > 0) {
            query = query.in(options.inColumn, options.inValues);
        }

        const { data, error } = await query;
        
        if (error) {
          const errorMsg = error.message || JSON.stringify(error);
          if (!errorMsg.includes('Failed to fetch')) {
             console.error(`Erro Supabase SELECT em ${table}:`, errorMsg);
          }
          return { data: null, error: errorMsg };
        }
        
        return { data, error: null };
      } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        return { data: null, error: errorMsg };
      }
    });
  },

  // Insere dados (INSERT)
  insert: async (table: string, data: Record<string, any>) => {
    return retryOperation(async () => {
        try {
        const { data: result, error } = await supabase
            .from(table)
            .insert(data)
            .select();

        if (error) {
            const errorMsg = error.message || JSON.stringify(error);
            console.error(`Erro Supabase INSERT em ${table}:`, errorMsg);
            return { data: null, error: errorMsg };
        }

        return { data: result, error: null };
        } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        console.error(`Exceção em api.insert (${table}):`, errorMsg);
        return { data: null, error: errorMsg };
        }
    }, 2);
  },

  // Atualiza dados (UPDATE)
  update: async (table: string, data: Record<string, any>, filters: Record<string, any>) => {
    return retryOperation(async () => {
        try {
        if (Object.keys(filters).length === 0) {
            throw new Error("Operação UPDATE requer filtros para segurança.");
        }

        const { data: result, error } = await supabase
            .from(table)
            .update(data)
            .match(filters)
            .select();

        if (error) {
            const errorMsg = error.message || JSON.stringify(error);
            console.error(`Erro Supabase UPDATE em ${table}:`, errorMsg);
            return { data: null, error: errorMsg };
        }

        return { data: result, error: null };
        } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        console.error(`Exceção em api.update (${table}):`, errorMsg);
        return { data: null, error: errorMsg };
        }
    });
  },

  // Deleta dados (DELETE)
  delete: async (table: string, filters: Record<string, any>) => {
    return retryOperation(async () => {
        try {
        if (Object.keys(filters).length === 0) {
            throw new Error("Operação DELETE requer filtros para segurança.");
        }

        const { error } = await supabase
            .from(table)
            .delete()
            .match(filters);

        if (error) {
            const errorMsg = error.message || JSON.stringify(error);
            console.error(`Erro Supabase DELETE em ${table}:`, errorMsg);
            return { data: null, error: errorMsg };
        }

        return { data: { success: true }, error: null };
        } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        console.error(`Exceção em api.delete (${table}):`, errorMsg);
        return { data: null, error: errorMsg };
        }
    });
  }
};
