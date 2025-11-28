
import React, { useState, useEffect } from 'react';
import { User, AffiliateLog } from '../types';
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
          
          // Se o usuário não tiver código, tenta gerar
          if (!stats.logs.length && !user.affiliate_code && !code) {
             // Lógica de geração aqui se necessário, mas melhor via botão
          }
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

    // REALTIME: Escuta novas comissões
    if(user) {
        const channel = supabase.channel(`affiliate_view:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_logs', filter: `affiliate_id=eq.${user.id}` }, () => {
                console.log("Nova comissão detectada!");
                refresh(); // Atualiza saldo no contexto
                loadData(); // Atualiza tabela
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users', filter: `referred_by=eq.${user.id}` }, () => {
                console.log("Novo indicado!");
                loadData();
            })
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }

  }, []); // Dependência vazia para mount, lógica interna usa refs/state seguro

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-black border border-yellow-600/30 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-yellow-600/20 flex justify-between items-center bg-gradient-to-r from-yellow-900/10 to-black rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-600/20 p-3 rounded-full">
                <i className="fas fa-handshake text-yellow-500 text-xl"></i>
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white">Programa de Afiliados</h2>
                <p className="text-sm text-yellow-500">Divulgue e ganhe 20% de comissão recorrente.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
            
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-sm mb-2">Saldo Disponível</p>
                    {/* Usa o saldo do contexto que é atualizado em realtime */}
                    <p className="text-3xl font-bold text-green-400">R$ {Number(user?.affiliate_balance || 0).toFixed(2).replace('.', ',')}</p>
                    {Number(user?.affiliate_balance || 0) > 0 && (
                        <button onClick={requestPayout} className="mt-3 text-xs bg-green-900/30 text-green-300 px-3 py-1 rounded hover:bg-green-900/50 transition">
                            Solicitar Saque
                        </button>
                    )}
                </div>
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-sm mb-2">Indicações Totais</p>
                    <p className="text-3xl font-bold text-white">{referralCount}</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400 text-sm mb-2">Ganhos Totais</p>
                    <p className="text-3xl font-bold text-yellow-500">R$ {totalEarnings.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>

            <div className="bg-yellow-900/10 border border-yellow-600/30 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4">Seu Link Exclusivo</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow bg-black border border-gray-700 rounded-lg p-3 text-gray-300 font-mono text-sm truncate flex items-center justify-between">
                        {generating ? 'Gerando seu código...' : affiliateLink}
                    </div>
                    <button 
                        onClick={copyToClipboard}
                        disabled={generating || !code}
                        className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition shadow-lg shadow-yellow-600/20 whitespace-nowrap"
                    >
                        <i className="fas fa-copy mr-2"></i> Copiar Link
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                    Compartilhe este link. Quando alguém se cadastrar através dele, você ganhará comissão sobre todas as compras que essa pessoa fizer.
                </p>
            </div>

            <div>
                <h3 className="text-lg font-bold text-white mb-4">Extrato Financeiro (Tempo Real)</h3>
                {loading ? (
                    <div className="text-center py-8 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Carregando extrato...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800 border-dashed">
                        <i className="fas fa-search-dollar text-4xl text-gray-700 mb-3"></i>
                        <p className="text-gray-500">Nenhuma comissão registrada ainda.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-yellow-500 uppercase bg-yellow-900/10">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Origem</th>
                                    <th className="px-6 py-3">Descrição</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="bg-gray-900/20 border-b border-gray-800 hover:bg-gray-900/40">
                                        <td className="px-6 py-4">{new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR')}</td>
                                        <td className="px-6 py-4">{log.source_email}</td>
                                        <td className="px-6 py-4">{log.description}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-400">
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
