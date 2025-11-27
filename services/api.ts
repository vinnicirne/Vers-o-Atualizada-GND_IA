
import { supabase } from './supabaseClient';

/**
 * API Service (Direct Connection)
 * Conecta diretamente ao Supabase usando o cliente oficial.
 * Removemos o Mock e o Proxy intermediário.
 */

export const api = {
  // Busca dados (SELECT)
  select: async (table: string, filters: Record<string, any> = {}) => {
    try {
      let query = supabase.from(table).select('*');
      
      // Aplica filtros se existirem
      if (Object.keys(filters).length > 0) {
        // .match é uma forma shorthand de aplicar vários .eq()
        query = query.match(filters);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error(`Erro Supabase SELECT em ${table}:`, error);
        return { data: null, error: error.message };
      }
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  // Insere dados (INSERT)
  insert: async (table: string, data: Record<string, any>) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select(); // .select() é importante para retornar o objeto criado

      if (error) {
        console.error(`Erro Supabase INSERT em ${table}:`, error);
        return { data: null, error: error.message };
      }

      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  // Atualiza dados (UPDATE)
  update: async (table: string, data: Record<string, any>, filters: Record<string, any>) => {
    try {
      // Segurança: impede update sem filtro para não alterar a tabela toda
      if (Object.keys(filters).length === 0) {
        throw new Error("Operação UPDATE requer filtros para segurança.");
      }

      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .match(filters)
        .select();

      if (error) {
        console.error(`Erro Supabase UPDATE em ${table}:`, error);
        return { data: null, error: error.message };
      }

      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  // Deleta dados (DELETE)
  delete: async (table: string, filters: Record<string, any>) => {
    try {
      if (Object.keys(filters).length === 0) {
        throw new Error("Operação DELETE requer filtros para segurança.");
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .match(filters);

      if (error) {
        console.error(`Erro Supabase DELETE em ${table}:`, error);
        return { data: null, error: error.message };
      }

      return { data: { success: true }, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }
};
