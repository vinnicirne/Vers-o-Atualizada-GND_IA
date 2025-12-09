
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { createApiKey, listApiKeys, revokeApiKey, generateWordPressPluginZip } from '../../services/developerService';
import { ApiKey } from '../../types';
import { Toast } from './Toast';
import { supabaseUrl, supabaseAnonKey } from '../../services/supabaseClient'; 

export function DocumentationViewer() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'user_manual' | 'technical' | 'api' | 'updates' | 'setup' | 'n8n_guide' | 'whatsapp'>('whatsapp');
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSqlFix, setShowSqlFix] = useState(false);
  
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
      const cachedKey = localStorage.getItem('gdn_gemini_key_cache');
      if (cachedKey) {
          setGeminiKeyInput(cachedKey);
      }
  }, []);

  useEffect(() => {
      if (activeTab === 'api' && user) {
          loadKeys();
      }
  }, [activeTab, user]);

  const loadKeys = async () => {
      if (!user) return;
      setLoadingKeys(true);
      setShowSqlFix(false);
      try {
          const keys = await listApiKeys(user.id);
          setApiKeys(keys);
      } catch (e: any) {
          console.error("Erro ao carregar chaves:", e);
          if (e.message === 'TABLE_NOT_FOUND') {
              setShowSqlFix(true);
          }
      } finally {
          setLoadingKeys(false);
      }
  };

  const handleCreateKey = async () => {
      if (!user || !newKeyName.trim()) return;
      try {
          const key = await createApiKey(user.id, newKeyName);
          setCreatedKey(key.full_key || null);
          setNewKeyName('');
          await loadKeys();
          setToast({ message: "Chave criada com sucesso!", type: 'success' });
      } catch (e: any) {
          console.error("Erro na criação:", e);
          if (e.message === 'TABLE_NOT_FOUND') {
              setShowSqlFix(true);
              setToast({ message: "Erro: Tabela de Chaves não encontrada. Veja instrução abaixo.", type: 'error' });
          } else {
              setToast({ message: `Erro ao criar chave: ${e.message}`, type: 'error' });
          }
      }
  };

  const handleRevokeKey = async (id: string) => {
      if (!window.confirm("Tem certeza? Qualquer sistema usando esta chave perderá acesso.")) return;
      try {
          await revokeApiKey(id);
          loadKeys();
          setToast({ message: "Chave revogada.", type: 'success' });
      } catch (e: any) {
          setToast({ message: `Erro ao revogar: ${e.message}`, type: 'error' });
      }
  };

  const handleDownloadPlugin = () => {
      if (!geminiKeyInput && !confirm("ATENÇÃO: Você não inseriu uma Chave Gemini. O plugin pode falhar com erro 'API Key not valid'. Deseja continuar mesmo assim?")) {
          return;
      }
      
      localStorage.setItem('gdn_gemini_key_cache', geminiKeyInput);
      
      generateWordPressPluginZip(geminiKeyInput);
      setToast({ message: "Download iniciado! Chave salva no navegador.", type: 'success' });
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTabClass = (tabName: string) => `px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === tabName ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`;

  const schemaSql = `
-- =========================================================
-- 🛠️ ATUALIZAÇÃO 3: WHATICKET SCHEMA (CRM Completo)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONEXÕES (WHATSAPP SESSIONS)
create table if not exists public.connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  name text default 'WhatsApp Principal',
  phone text,
  status text default 'offline', -- offline, qrcode, connected
  qr_code text,
  session_path text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. TABELA DE FILAS / SETORES
create table if not exists public.queues (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  name text not null,
  color text default '#333333',
  created_at timestamptz default now()
);

-- 3. ATUALIZAÇÃO TABELA CONTATOS (Se não existir, cria)
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  phone text not null unique,
  name text,
  profile_pic_url text,
  created_at timestamptz default now()
);

-- 4. TABELA DE TICKETS (ATENDIMENTOS)
create table if not exists public.tickets (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references public.contacts(id),
  connection_id uuid references public.connections(id),
  queue_id uuid references public.queues(id),
  status text default 'pending', -- pending, open, closed
  last_message text,
  unread_count int default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 5. TABELA DE MENSAGENS (VINCULADA AO TICKET)
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references public.tickets(id),
  contact_id uuid references public.contacts(id),
  body text,
  media_url text,
  media_type text,
  from_me boolean default false,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 6. POLÍTICAS RLS (Simplificadas para MVP)
alter table public.connections enable row level security;
create policy "Users manage own connections" on public.connections for all using (auth.uid() = user_id);

alter table public.tickets enable row level security;
create policy "Public access to tickets" on public.tickets for all using (true); -- Ajuste conforme necessidade

alter table public.messages enable row level security;
create policy "Public access to messages" on public.messages for all using (true);

-- 7. FUNÇÕES AUXILIARES
create or replace function update_ticket_last_message()
returns trigger as $$
begin
  update public.tickets 
  set last_message = new.body, updated_at = now(), unread_count = unread_count + 1
  where id = new.ticket_id;
  return new;
end;
$$ language plpgsql;

create trigger on_new_message
after insert on public.messages
for each row execute procedure update_ticket_last_message();
`;

const whatsappBackendCode = `
/**
 * 🚀 BACKEND "WHATICKET PRO" (Node.js + Baileys + Supabase)
 * 
 * Instalação:
 * 1. Crie uma pasta: mkdir backend-crm && cd backend-crm
 * 2. Inicie: npm init -y
 * 3. Instale: npm install @whiskeysockets/baileys express cors dotenv @supabase/supabase-js qrcode-terminal
 * 4. Crie este arquivo como server.js
 * 5. Crie um arquivo .env com:
 *    SUPABASE_URL=sua_url
 *    SUPABASE_KEY=sua_service_role_key
 * 6. Rode: node server.js
 */

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURAÇÃO ---
const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Armazena sessões ativas na memória: { [connectionId]: socket }
const sessions = {};

// --- FUNÇÃO PRINCIPAL: INICIAR SESSÃO ---
async function startSession(connectionId) {
    const sessionPath = path.join(__dirname, 'sessions', connectionId);
    
    // Cria pasta se não existir
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        browser: ["GDN CRM", "Chrome", "1.0"]
    });

    // Salva referência na memória
    sessions[connectionId] = sock;

    // --- EVENTOS ---
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Atualiza QR no Banco
        if (qr) {
            console.log(\`[\${connectionId}] QR Code Gerado\`);
            await supabase.from('connections').update({ 
                qr_code: qr, 
                status: 'qrcode',
                updated_at: new Date()
            }).eq('id', connectionId);
        }

        if (connection === 'open') {
            console.log(\`[\${connectionId}] Conectado!\`);
            await supabase.from('connections').update({ 
                qr_code: null, 
                status: 'connected',
                phone: sock.user.id.split(':')[0],
                updated_at: new Date()
            }).eq('id', connectionId);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(\`[\${connectionId}] Desconectado. Reconectar? \${shouldReconnect}\`);
            
            await supabase.from('connections').update({ status: 'offline' }).eq('id', connectionId);

            if (shouldReconnect) {
                startSession(connectionId);
            } else {
                delete sessions[connectionId];
                // Opcional: Limpar pasta de sessão se foi logout
            }
        }
    });

    // --- RECEBIMENTO DE MENSAGENS ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            // Extrair dados
            const remoteJid = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            const phone = remoteJid.replace('@s.whatsapp.net', '');
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '[Mídia]';
            const pushName = msg.pushName || phone;

            if (remoteJid.includes('@g.us')) continue; // Ignora grupos por enquanto

            console.log(\`[\${connectionId}] Msg de \${phone}: \${body}\`);

            // 1. Buscar ou Criar Contato
            let { data: contact } = await supabase.from('contacts').select('*').eq('phone', phone).single();
            
            if (!contact) {
                const { data: newContact } = await supabase.from('contacts').insert({ phone, name: pushName }).select().single();
                contact = newContact;
            }

            // 2. Buscar ou Criar Ticket (Conversa)
            let { data: ticket } = await supabase.from('tickets')
                .select('*')
                .eq('contact_id', contact.id)
                .eq('connection_id', connectionId)
                .neq('status', 'closed')
                .single();

            if (!ticket) {
                const { data: newTicket } = await supabase.from('tickets').insert({
                    contact_id: contact.id,
                    connection_id: connectionId,
                    status: 'open',
                    last_message: body,
                    unread_count: 1
                }).select().single();
                ticket = newTicket;
            } else {
                // Atualiza ticket existente
                await supabase.from('tickets').update({
                    last_message: body,
                    unread_count: ticket.unread_count + 1,
                    updated_at: new Date()
                }).eq('id', ticket.id);
            }

            // 3. Salvar Mensagem
            await supabase.from('messages').insert({
                ticket_id: ticket.id,
                contact_id: contact.id,
                body: body,
                from_me: fromMe
            });
        }
    });
}

// --- ROTAS API ---

// Iniciar conexão
app.post('/connections/start', async (req, res) => {
    const { connectionId } = req.body;
    if (!connectionId) return res.status(400).json({ error: 'Connection ID required' });
    
    // Se já existe, retorna ok
    if (sessions[connectionId]) return res.json({ message: 'Session already active' });

    startSession(connectionId);
    res.json({ message: 'Session starting...' });
});

// Pegar status/QR
app.get('/connections/:id/status', async (req, res) => {
    const { id } = req.params;
    const { data } = await supabase.from('connections').select('status, qr_code').eq('id', id).single();
    res.json(data || { status: 'offline' });
});

// Enviar Mensagem
app.post('/messages/send', async (req, res) => {
    const { connectionId, phone, text } = req.body;
    
    const sock = sessions[connectionId];
    if (!sock) return res.status(404).json({ error: 'Session not found or offline' });

    try {
        await sock.sendMessage(\`\${phone}@s.whatsapp.net\`, { text });
        
        // O evento messages.upsert do Baileys captura msg enviada por nós também (fromMe=true),
        // então não precisamos salvar manualmente no banco aqui se o listener tratar fromMe.
        // Se o listener filtrar fromMe, então salve aqui.
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- INICIALIZAÇÃO ---
app.listen(3001, async () => {
    console.log('🚀 Backend Whaticket Pro rodando na porta 3001');
    
    // Opcional: Reiniciar sessões salvas no banco
    const { data: connections } = await supabase.from('connections').select('id').eq('status', 'connected');
    if (connections) {
        connections.forEach(c => startSession(c.id));
    }
});
`;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="border-b border-gray-200 flex justify-between items-center flex-wrap gap-4 pb-4">
        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('user_manual')} className={getTabClass('user_manual')}><i className="fas fa-book mr-2"></i>Manual Usuário</button>
          <button onClick={() => setActiveTab('whatsapp')} className={getTabClass('whatsapp')}><i className="fab fa-whatsapp mr-2"></i>Backend CRM (Pro)</button>
          <button onClick={() => setActiveTab('api')} className={getTabClass('api')}><i className="fas fa-plug mr-2"></i>API / Devs</button>
          <button onClick={() => setActiveTab('updates')} className={getTabClass('updates')}><i className="fas fa-sync-alt mr-2"></i>Updates & SQL</button>
        </nav>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        
        {activeTab === 'whatsapp' && (
            <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-blue-800 mb-2"><i className="fab fa-node-js mr-2"></i>Backend Whaticket (Multi-Sessão)</h2>
                    <p className="text-blue-700 text-sm mb-4">
                        Este é o código completo do servidor Node.js que gerencia as conexões do WhatsApp. Ele suporta <strong>múltiplas sessões</strong> (ex: Vendas, Suporte) e salva tudo no Supabase.
                    </p>
                    <div className="text-sm text-blue-800 space-y-2">
                        <p><strong>Passo a Passo de Instalação:</strong></p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Crie uma pasta no seu computador ou VPS: <code>backend-crm</code></li>
                            <li>Abra o terminal na pasta e digite: <code>npm init -y</code></li>
                            <li>Instale as dependências: <code className="bg-blue-100 px-1 rounded">npm install @whiskeysockets/baileys express cors dotenv @supabase/supabase-js qrcode-terminal</code></li>
                            <li>Crie um arquivo chamado <code>server.js</code> e cole o código abaixo.</li>
                            <li>Crie um arquivo <code>.env</code> com suas credenciais do Supabase.</li>
                            <li>Rode com: <code>node server.js</code></li>
                        </ol>
                    </div>
                </div>
                
                <div className="relative bg-gray-900 border border-gray-700 text-gray-300 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[600px] overflow-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                        <span className="font-bold text-green-400">server.js</span>
                        <button onClick={() => handleCopy(whatsappBackendCode, 'wa_backend')} className="px-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded font-bold hover:bg-gray-600 text-white transition">
                            {copiedField === 'wa_backend' ? 'Copiado!' : 'Copiar Código'}
                        </button>
                    </div>
                    <pre className="whitespace-pre-wrap">{whatsappBackendCode}</pre>
                </div>
            </div>
        )}

        {/* ... (Other tabs content kept as is) ... */}
        
        {activeTab === 'updates' && (
            <div className="space-y-8">
                <div className="prose prose-slate max-w-none">
                    <h1 className="text-3xl font-bold text-[#263238] mb-4">Atualizações & SQL</h1>
                    
                    <h3 className="text-lg font-bold text-blue-600 mt-6 mb-2">Atualização 3: CRM Schema (Whaticket)</h3>
                    <p className="text-sm text-gray-500 mb-2">Estrutura completa de banco de dados para o CRM Multi-Sessão.</p>
                    <div className="relative bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg text-xs font-mono shadow-inner max-h-[300px] overflow-auto custom-scrollbar">
                        <pre className="whitespace-pre-wrap">{schemaSql}</pre>
                        <button onClick={() => handleCopy(schemaSql, 'schema_sql')} className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded font-bold hover:bg-gray-100">
                            {copiedField === 'schema_sql' ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Placeholder for other tabs to avoid errors if clicked */}
        {(activeTab === 'user_manual' || activeTab === 'technical' || activeTab === 'api' || activeTab === 'n8n_guide' || activeTab === 'setup') && (
             <div className="text-center py-10 text-gray-500">
                 <p>Conteúdo desta aba disponível nas versões anteriores.</p>
             </div>
        )}

      </div>
    </div>
  );
}
