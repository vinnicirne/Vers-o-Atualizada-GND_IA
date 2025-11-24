import { supabase } from './supabaseClient';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  creditsInCirculation: number;
  totalRevenue: number;
}

export interface DailyUsageDataPoint {
    report_date: string; // Esperado como 'YYYY-MM-DD' do banco de dados
    news_count: number;
    new_users_count: number;
}

/**
 * Busca as principais métricas do dashboard de uma só vez.
 * Utiliza chamadas RPC para operações complexas/seguras e consultas diretas para contagens simples.
 * Pressupõe a existência das seguintes funções RPC no Supabase:
 * - get_active_users_7d(): Retorna a contagem de usuários ativos nos últimos 7 dias.
 */
export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  try {
    // Função para buscar o faturamento total diretamente
    const fetchTotalRevenue = async () => {
        const { data, error } = await supabase
            .from('transactions')
            .select('valor')
            .eq('status', 'approved');
        
        if (error) throw new Error(`Faturamento: ${error.message}`);
        return data?.reduce((sum, transaction) => sum + transaction.valor, 0) || 0;
    };
      
    // Função para buscar créditos em circulação da tabela 'user_credits'
    const fetchCirculatingCredits = async () => {
        const { data, error } = await supabase
            .from('user_credits') 
            .select('credits')
            .neq('credits', -1); // Admins/créditos ilimitados são -1, não os contamos
        if (error) throw new Error(`Créditos em Circulação: ${error.message}`);
        return data?.reduce((sum, user) => sum + user.credits, 0) || 0;
    };

    // FIX: Replaced failing `get_active_users_7d` RPC. It now calculates active users
    // by counting distinct users from the 'logs' table in the last 7 days. This avoids
    // the "permission denied for table users" error.
    const fetchActiveUsers = async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('logs')
            .select('usuario_id')
            .gte('data', sevenDaysAgo.toISOString());

        if (error) {
            console.error("Could not determine active users from logs:", error.message);
            // Return 0 so the rest of the dashboard can still render.
            return 0;
        }
        
        if (!data) return 0;
        
        const uniqueUserIds = new Set(data.map(log => log.usuario_id).filter(Boolean));
        return uniqueUserIds.size;
    };

    const [
      totalUsersRes,
      activeUsers,
      creditsInCirculation,
      totalRevenue,
    ] = await Promise.all([
      // 1. Total de usuários (lendo da tabela de perfis da aplicação)
      supabase.from('app_users').select('id', { count: 'exact', head: true }),
      // 2. Usuários ativos (calculado a partir dos logs)
      fetchActiveUsers(),
      // 3. Créditos em circulação (via query direta na tabela 'user_credits')
      fetchCirculatingCredits(),
      // 4. Faturamento total (via query direta)
      fetchTotalRevenue(),
    ]);

    // Verificação de erros para cada promessa
    if (totalUsersRes.error) throw new Error(`Total de Usuários: ${totalUsersRes.error.message}`);
    
    return {
      totalUsers: totalUsersRes.count ?? 0,
      activeUsers: activeUsers ?? 0,
      creditsInCirculation: creditsInCirculation ?? 0,
      totalRevenue: totalRevenue ?? 0,
    };
  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    if (error instanceof Error) {
        // Personaliza a mensagem de erro para ser mais amigável, indicando que pode ser uma função RPC faltando
        if(error.message.includes('relation') && error.message.includes('does not exist')) {
            throw new Error("Uma função necessária (RPC) não foi encontrada no banco de dados. Verifique a configuração.");
        }
        throw error;
    }
    throw new Error('Ocorreu um erro desconhecido ao buscar as métricas.');
  }
};

/**
 * Busca os dados de uso diário para o gráfico.
 * Pressupõe a existência da função RPC `get_daily_platform_usage` no Supabase.
 * Esta função deve retornar uma lista de registros para cada um dos últimos 7 dias,
 * mesmo que a contagem seja zero, para garantir um gráfico contínuo.
 * Formato esperado do retorno: [{ report_date: 'YYYY-MM-DD', news_count: X, new_users_count: Y }, ...]
 */
export const getDailyUsageChartData = async (): Promise<DailyUsageDataPoint[]> => {
    const { data, error } = await supabase.rpc('get_daily_platform_usage');

    if (error) {
        // Log the full error object for debugging purposes
        console.error('Erro ao buscar dados do gráfico de uso:', error);

        // Safely extract the error message to avoid displaying "[object Object]"
        let errorMessage = 'Falha ao carregar os dados de uso diário.';
        if (error && typeof error.message === 'string') {
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                 errorMessage = "A função para buscar dados do gráfico ('get_daily_platform_usage') não foi encontrada no banco de dados.";
            } else {
                errorMessage = error.message;
            }
        }
        
        throw new Error(errorMessage);
    }

    return data;
};