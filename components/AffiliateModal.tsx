
import React, { useState, useEffect } from 'react';
import { AffiliateLog } from '../types';
import { generateAffiliateCode, getAffiliateStats } from '../services/adminService';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';

interface AffiliateModalProps {
  onClose: () => void;
}

export function AffiliateModal({ onClose }: AffiliateModalProps) {
  const { user, refresh } = useUser();
  const [code, setCode] = useState<string | null>(user?.affiliate_code || null);
  const [logs, setLogs] = useState<AffiliateLog[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
      if (user?.affiliate_code) {
          setCode(user.affiliate_code);
      }
  }, [user]);

  const loadData = async () => {
      if (!user) return;
      try {
          const stats = await getAffiliateStats(user.id);
          setLogs(stats.logs);
          setReferralCount(stats.referralCount);
          setTotalEarnings(stats.totalEarnings);
      } catch (e) {
          console.error("Erro ao buscar stats:", e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    const init = async () => {
        if (!user) return;
        setLoading(true);
        await refresh();

        if (!user.affiliate_code && !code) {
            setGenerating(true);
            try {
                const newCode = await generateAffiliateCode(user.id, user.full_name || 'User');
                setCode(newCode);
                await refresh(); 
            } catch (e) {
                console.error("Erro ao gerar código:", e);
            } finally {
                setGenerating(false);
            }
        }
        await loadData();
    };

    init();

    if(user) {
        const channel = supabase.channel(`affiliate_view:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_logs', filter: `affiliate_id=eq.${user.id}` }, () => {
                refresh();
                loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users', filter: `referred_by=eq.${user.id}` }, () => {
                loadData();
            })
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }

  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getAffiliateLink = () => {
      if (!code) return '';
      const baseUrl = window.location.origin;
      return `${baseUrl}/?ref=${code}`;
  };

  const affiliateLink = code ? getAffiliateLink() : 'Gerando...';

  const copyToClipboard = async () => {
      if (!code) return;
      try {
          await navigator.clipboard.writeText(affiliateLink);
          alert("Link copiado para a área de transferência!");
      } catch (err) {
          const textArea = document.createElement("textarea");
          textArea.value = affiliateLink;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand("copy");
            alert("Link copiado!");
          } catch (e) {
            alert("Erro ao copiar.");
          }
          document.body.removeChild(textArea);
      }
  };

  const requestPayout = () => {
      alert("Solicitação de saque enviada! Entraremos em contato em breve.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header - Light Theme */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
             <div className="bg-yellow-50 p-3 rounded-full border border-yellow-200">
                <i className="fas fa-handshake text-[#F59E0B] text-xl"></i>
             </div>
             <div>
                <h2 className="text-xl font-bold text-[#263238]">Programa de Afiliados</h2>
                <p className="text-sm text-[#F59E0B] font-medium">Divulgue e ganhe 20% de comissão recorrente.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#263238] transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-[#ECEFF1]">
            
            <div className="grid md:grid-cols-3 gap-4">
                {/* Saldo Disponível */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-gray-500 text-sm font-medium mb-2 uppercase tracking-wide">Saldo Disponível</p>
                    <p className="text-3xl font-bold text-[#10B981]">R$ {Number(user?.affiliate_balance || 0).toFixed(2).replace('.', ',')}</p>
                    {Number(user?.affiliate_balance || 0) > 0 && (
                        <button onClick={requestPayout} className="mt-3 text-xs bg-[#10B981]/10 text-[#10B981] px-3 py-1.5 rounded hover:bg-[#10B981]/20 transition border border-[#10B981]/20 font-bold">
                            Solicitar Saque
                        </button>
                    )}
                </div>
                
                {/* Indicações */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-gray-500 text-sm font-medium mb-2 uppercase tracking-wide">Indicações Totais</p>
                    <p className="text-3xl font-bold text-[#263238]">{referralCount}</p>
                </div>

                {/* Ganhos Totais */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-gray-500 text-sm font-medium mb-2 uppercase tracking-wide">Ganhos Totais</p>
                    <p className="text-3xl font-bold text-[#F59E0B]">R$ {totalEarnings.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>

            {/* Link Exclusivo */}
            <div className="bg-white border border-[#F59E0B]/30 p-6 rounded-lg shadow-sm">
                <h3 className="text-base font-bold text-[#263238] mb-4">Seu Link Exclusivo</h3>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-grow bg-[#F5F7FA] border border-gray-300 rounded-md px-4 py-3 text-gray-700 font-mono text-sm flex items-center justify-between">
                        <span className="truncate">{generating ? 'Gerando seu código...' : affiliateLink}</span>
                    </div>
                    <button 
                        onClick={copyToClipboard}
                        disabled={generating || !code}
                        className="bg-[#D97706] hover:bg-[#B45309] text-white font-bold px-6 py-3 rounded-md transition shadow-lg shadow-orange-900/10 whitespace-nowrap flex items-center gap-2 justify-center"
                    >
                        <i className="fas fa-copy"></i> Copiar Link
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    Compartilhe este link. Quando alguém se cadastrar através dele, você ganhará comissão sobre todas as compras que essa pessoa fizer.
                </p>
            </div>

            {/* Table */}
            <div>
                <h3 className="text-base font-bold text-[#263238] mb-4">Extrato Financeiro (Tempo Real)</h3>
                {loading ? (
                    <div className="text-center py-8 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando extrato...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
                        <i className="fas fa-search-dollar text-4xl text-gray-300 mb-3"></i>
                        <p className="text-gray-500 text-sm">Nenhuma comissão registrada ainda.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Data</th>
                                    <th className="px-6 py-3 font-medium">Origem</th>
                                    <th className="px-6 py-3 font-medium">Descrição</th>
                                    <th className="px-6 py-3 text-right font-medium">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">{new Date(log.created_at).toLocaleDateString('pt-BR')} <span className="text-xs opacity-70 ml-1">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span></td>
                                        <td className="px-6 py-4 text-[#263238] font-medium">{log.source_email}</td>
                                        <td className="px-6 py-4 text-gray-500">{log.description}</td>
                                        <td className="px-6 py-4 text-right font-bold text-[#10B981]">
                                            + R$ {Number(log.amount).toFixed(2).replace('.', ',')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
