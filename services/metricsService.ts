import { api } from './api';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  creditsInCirculation: number;
  totalRevenue: number;
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
    // 1. Total Users
    const { data: usersData } = await api.select('app_users');
    const totalUsers = usersData ? usersData.length : 0;

    // 2. Active Users (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Fetch logs - might be heavy, but necessary without RPC
    const { data: logsData } = await api.select('logs');
    let activeUsers = 0;
    if (logsData) {
        const recentLogs = logsData.filter((log: any) => new Date(log.data) >= sevenDaysAgo);
        const uniqueUsers = new Set(recentLogs.map((log: any) => log.usuario_id).filter(Boolean));
        activeUsers = uniqueUsers.size;
    }

    // 3. Credits
    const { data: creditsData } = await api.select('user_credits');
    let creditsInCirculation = 0;
    if (creditsData) {
        creditsInCirculation = creditsData
            .filter((c: any) => c.credits !== -1)
            .reduce((sum: number, c: any) => sum + c.credits, 0);
    }

    // 4. Revenue
    const { data: transactionsData } = await api.select('transactions', { status: 'approved' });
    let totalRevenue = 0;
    if (transactionsData) {
        totalRevenue = transactionsData.reduce((sum: number, t: any) => sum + t.valor, 0);
    }

    return {
      totalUsers,
      activeUsers,
      creditsInCirculation,
      totalRevenue,
    };
  } catch (error) {
    console.error('Erro ao buscar métricas via Proxy:', error);
    throw new Error('Falha ao calcular métricas.');
  }
};

export const getDailyUsageChartData = async (): Promise<DailyUsageDataPoint[]> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch needed data
        const { data: newsData } = await api.select('news');
        const { data: usersData } = await api.select('app_users');

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
        console.error('Erro ao calcular gráfico via Proxy:', error);
        return [];
    }
};
