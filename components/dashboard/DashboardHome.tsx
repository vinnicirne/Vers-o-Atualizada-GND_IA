import React from 'react';
import {
    FileText,
    Image as ImageIcon,
    Mic,
    BarChart3,
    Sparkles,
    Zap,
    TrendingUp,
    Layout,
    ArrowRight
} from 'lucide-react';
import { ServiceKey } from '../../types/plan.types';

interface StatCardProps {
    icon: any;
    title: string;
    value: string | number;
    change: string;
    color: string;
}

const StatCard = ({ icon: Icon, title, value, change, color }: StatCardProps) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
                <TrendingUp className="w-3 h-3" />
                {change}
            </div>
        </div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
);

interface QuickActionCardProps {
    icon: any;
    title: string;
    description: string;
    color: string;
    onClick: () => void;
}

const QuickActionCard = ({ icon: Icon, title, description, color, onClick }: QuickActionCardProps) => (
    <div
        onClick={onClick}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
    >
        <div className={`p-4 rounded-2xl ${color} w-fit mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
            <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
        <div className="mt-4 flex items-center text-indigo-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            Começar <ArrowRight className="w-3 h-3 ml-1" />
        </div>
    </div>
);

interface DashboardHomeProps {
    userEmail?: string;
    userCredits?: number;
    userPlan?: string;
    onStartService: (mode: ServiceKey) => void;
}

export function DashboardHome({ userEmail, userCredits, userPlan, onStartService }: DashboardHomeProps) {
    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-indigo-200">
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold mb-6 border border-white/20">
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        <span>Powered by Gemini & Advanced AI Models</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
                        Olá, {userEmail?.split('@')[0] || 'Criador'}! 👋
                    </h1>
                    <p className="text-indigo-100 text-lg mb-8 leading-relaxed font-medium">
                        O que vamos criar hoje? Transforme suas ideias em realidade com as ferramentas de IA mais poderosas do mercado.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                            onClick={() => onStartService('news_generator')}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-700 rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                            Gerar Conteúdo Agora
                        </button>
                        <button className="w-full sm:w-auto px-8 py-4 bg-indigo-600/30 backdrop-blur-md border border-white/30 text-white rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                            Assistir Tutorial
                        </button>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
                <Sparkles className="absolute right-12 bottom-12 w-32 h-32 text-white/5 rotate-12 hidden md:block" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Zap}
                    title="Créditos Restantes"
                    value={userCredits === -1 ? 'Ilimitado' : (userCredits || 0)}
                    change="Atualizado"
                    color="bg-amber-500 shadow-amber-200 shadow-lg"
                />
                <StatCard
                    icon={FileText}
                    title="Textos Gerados"
                    value="--"
                    change="+12% este mês"
                    color="bg-indigo-500 shadow-indigo-200 shadow-lg"
                />
                <StatCard
                    icon={ImageIcon}
                    title="Mídia Criada"
                    value="--"
                    change="+8% este mês"
                    color="bg-purple-500 shadow-purple-200 shadow-lg"
                />
                <StatCard
                    icon={Layout}
                    title="Plano Atual"
                    value={userPlan || 'Free'}
                    change="Nível Pro"
                    color="bg-emerald-500 shadow-emerald-200 shadow-lg"
                />
            </div>

            {/* Quick Actions */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-indigo-600" />
                        Ações Rápidas
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <QuickActionCard
                        icon={FileText}
                        title="GDN Notícias"
                        description="Artigos otimizados para Rank Math SEO 100/100."
                        color="bg-indigo-600 shadow-indigo-100 shadow-xl"
                        onClick={() => onStartService('news_generator')}
                    />
                    <QuickActionCard
                        icon={ImageIcon}
                        title="Studio de Arte"
                        description="Imagens ultra-realistas de 8K com Stable Diffusion."
                        color="bg-purple-600 shadow-purple-100 shadow-xl"
                        onClick={() => onStartService('image_generation')}
                    />
                    <QuickActionCard
                        icon={Layout}
                        title="Criador de Sites"
                        description="Landing pages premium com Tailwind e Glassmorphism."
                        color="bg-emerald-600 shadow-emerald-100 shadow-xl"
                        onClick={() => onStartService('landingpage_generator')}
                    />
                    <QuickActionCard
                        icon={Mic}
                        title="Texto p/ Fala"
                        description="Vozes humanas e ultra-realistas com emoção."
                        color="bg-orange-600 shadow-orange-100 shadow-xl"
                        onClick={() => onStartService('text_to_speech')}
                    />
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    Atividade Recente
                </h2>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {[
                        { type: 'Notícias', title: 'Artigo sobre Tecnologia 2026', time: 'há 2 horas', status: 'completed' },
                        { type: 'Imagem', title: 'Banner para Social Media', time: 'há 5 horas', status: 'completed' },
                        { type: 'Site', title: 'Landing Page de Consultoria', time: 'há 1 dia', status: 'processing' },
                    ].map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-5 hover:bg-slate-50 transition-colors ${idx !== 2 ? 'border-b border-slate-50' : ''}`}>
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                                    <p className="text-xs text-slate-500 font-medium">{item.type} • {item.time}</p>
                                </div>
                            </div>
                            <span className={`px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 animate-pulse'
                                }`}>
                                {item.status === 'completed' ? 'Concluído' : 'Processando'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 shadow-2xl">
                <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Supere seus limites com a IA Ultra 🚀</h3>
                    <p className="text-slate-400">Combine geradores para criar fluxos de trabalho completos: do texto ao site em minutos.</p>
                </div>
                <button
                    onClick={() => window.open('https://ajuda.gdn.ia', '_blank')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                    Explorar Documentação <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
