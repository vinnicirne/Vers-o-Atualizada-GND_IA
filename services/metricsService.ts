import { api } from './api';
import { supabase } from './supabaseClient';
import { GUEST_ID } from '../constants';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  creditsInCirculation: number;
  totalRevenue: number;
  totalGenerations: number;
  guestGenerations: number;
  systemErrors: number;
  totalCommissions: number;
}

export interface DailyUsageDataPoint {
    report_date: string;
    news_count: number;
    new_users_count: number;
}

// Helper to format date YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  try {
    // 1. Total Users (Count Exact)
    const { count: totalUsers } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true });

    // 2. Active Users (Last 7 Days) - Fetch IDs only for performance
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Using supabase direct client for complex filtering logic not supported by simple proxy
    const { data: activeLogs } = await supabase
        .from('logs')
        .select('usuario_id')
        .gte('data', sevenDaysAgo.toISOString());
    
    let activeUsers = 0;
    if (activeLogs) {
        const uniqueUsers = new Set(activeLogs.map((log: any) => log.usuario_id).filter((id: string) => id && id !== GUEST_ID));
        activeUsers = uniqueUsers.size;
    }

    // 3. Credits (Sum)
    const { data: creditsData } = await api.select('user_credits');
    let creditsInCirculation = 0;
    if (creditsData) {
        creditsInCirculation = creditsData
            .filter((c: any) => c.credits !== -1)
            .reduce((sum: number, c: any) => sum + c.credits, 0);
    }

    // 4. Revenue (Sum)
    const { data: transactionsData } = await api.select('transactions', { status: 'approved' });
    let totalRevenue = 0;
    if (transactionsData) {
        totalRevenue = transactionsData.reduce((sum: number, t: any) => sum + t.valor, 0);
    }

    // 5. Guest Generations (Count Exact with Filter)
    // Counts logs where user is GUEST and action starts with 'generated_content_'
    // Using simple ILIKE search on action column
    const { count: guestGenerations } = await supabase
        .from('logs')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', GUEST_ID)
        .ilike('acao', 'generated_content_%');

    // 6. Total Generations (News Count + Guest Count)
    const { count: userGenerations } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });
        
    const totalGenerations = (userGenerations || 0) + (guestGenerations || 0);

    // 7. System Errors (Last 24h)
    // Counting logs where JSON details contains "level": "error" is hard without proper indexing/parsing
    // We will approximate by fetching recent logs and filtering in memory or checking action names if applicable
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const { data: recentLogs } = await supabase
        .from('logs')
        .select('detalhes')
        .gte('data', oneDayAgo.toISOString());
        
    let systemErrors = 0;
    if (recentLogs) {
        systemErrors = recentLogs.filter((log: any) => {
            const det = log.detalhes;
            // Check for explicit level or common error keys
            return det && (det.level === 'error' || det.error); 
        }).length;
    }

    // 8. Total Commissions Paid
    const { data: affiliateLogs } = await api.select('affiliate_logs');
    let totalCommissions = 0;
    if (affiliateLogs) {
        totalCommissions = affiliateLogs.reduce((sum: number, log: any) => sum + Number(log.amount), 0);
    }

    return {
      totalUsers: totalUsers || 0,
      activeUsers,
      creditsInCirculation,
      totalRevenue,
      totalGenerations,
      guestGenerations: guestGenerations || 0,
      systemErrors,
      totalCommissions
    };
  } catch (error) {
    console.error('Erro ao buscar métricas (Otimizado):', error);
    // Return zeros on error to avoid crashing UI
    return {
      totalUsers: 0,
      activeUsers: 0,
      creditsInCirculation: 0,
      totalRevenue: 0,
      totalGenerations: 0,
      guestGenerations: 0,
      systemErrors: 0,
      totalCommissions: 0
    };
  }
};

export const getDailyUsageChartData = async (): Promise<DailyUsageDataPoint[]> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch needed data (optimized selection)
        const { data: newsData } = await supabase
            .from('news')
            .select('criado_em')
            .gte('criado_em', sevenDaysAgo.toISOString());
            
        const { data: usersData } = await supabase
            .from('app_users')
            .select('created_at')
            .gte('created_at', sevenDaysAgo.toISOString());

        // Initialize map for last 7 days
        const dailyMap = new Map<string, { news: number, users: number }>();
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyMap.set(formatDate(d), { news: 0, users: 0 });
        }

        // Process News
        if (newsData) {
            newsData.forEach((n: any) => {
                const dateKey = formatDate(new Date(n.criado_em));
                if (dailyMap.has(dateKey)) {
                    dailyMap.get(dateKey)!.news++;
                }
            });
        }

        // Process Users
        if (usersData) {
            usersData.forEach((u: any) => {
                const dateKey = formatDate(new Date(u.created_at));
                if (dailyMap.has(dateKey)) {
                    dailyMap.get(dateKey)!.users++;
                }
            });
        }

        // Convert map to array
        const chartData: DailyUsageDataPoint[] = [];
        dailyMap.forEach((val, key) => {
            chartData.push({
                report_date: key,
                news_count: val.news,
                new_users_count: val.users
            });
        });

        // Sort by date ascending
        return chartData.sort((a, b) => a.report_date.localeCompare(b.report_date));

    } catch (error) {
        console.error('Erro ao calcular gráfico:', error);
        return [];
    }
};