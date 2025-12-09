const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // Allow Frontend access
app.use(express.json());

const PORT = 3001; // Changed to 3001 to avoid conflict with React (3000)
const SESSION_DIR = path.join(__dirname, 'session');

// Global State
let sock;
let status = 'disconnected'; // disconnected, connecting, connected, qr_required
let qrCodeString = null;

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WA] Usando versão v${version.join('.')}`);

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['GDN_IA CRM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            status = 'qr_required';
            qrCodeString = qr;
            console.log('[WA] Novo QR Code gerado.');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            status = 'disconnected';
            console.log('[WA] Conexão fechada. Reconectando...', shouldReconnect);
            
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('[WA] Desconectado (Logout). Limpe a pasta session para reiniciar.');
                qrCodeString = null;
            }
        } else if (connection === 'open') {
            status = 'connected';
            qrCodeString = null;
            console.log('[WA] Conectado com sucesso!');
        } else if (connection === 'connecting') {
            status = 'connecting';
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            console.log(`[WA] Mensagem de ${msg.key.remoteJid}: ${msg.message?.conversation || '[Mídia/Outros]'}`);
        }
    });
}

// --- API ROUTES ---

// 1. Status
app.get('/status', (req, res) => {
    // Return format compatible with both our simple logic and typical status checks
    res.json({ 
        status, 
        message: getStatusMessage(status),
        instance: { state: status === 'connected' ? 'open' : status } // Compatibility
    });
});

// 2. QR Code
app.get('/qr', async (req, res) => {
    // JSON Response for React Frontend
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        if (status === 'connected') return res.json({ status: 'connected', qr: null });
        if (!qrCodeString) return res.json({ status, qr: null });
        
        // Return Base64 for the frontend to render
        try {
            const url = await QRCode.toDataURL(qrCodeString);
            return res.json({ status: 'qr_required', qr: qrCodeString, base64: url });
        } catch (e) {
            return res.status(500).json({ error: 'Failed to generate QR' });
        }
    }

    // HTML Response for direct browser view
    if (status === 'connected') return res.send('<h1>Já conectado! ✅</h1>');
    if (!qrCodeString) return res.send('<h1>Aguardando QR Code... Recarregue em breve. ⏳</h1>');

    try {
        const url = await QRCode.toDataURL(qrCodeString);
        res.send(`
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Arial;">
                <h1>Escaneie para conectar ao CRM</h1>
                <img src="${url}" alt="QR Code" />
                <p>Status: <strong>${status}</strong></p>
                <script>setTimeout(() => location.reload(), 3000);</script>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Erro ao gerar QR Code');
    }
});

// 3. Send Message
app.post('/send', async (req, res) => {
    const { number, message } = req.body;

    if (status !== 'connected') {
        return res.status(400).json({ error: 'WhatsApp não está conectado.' });
    }

    try {
        const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true, message: 'Mensagem enviada!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Erro ao enviar mensagem.' });
    }
});

function getStatusMessage(st) {
    switch (st) {
        case 'qr_required': return 'Aguardando Leitura';
        case 'connecting': return 'Conectando...';
        case 'connected': return 'Conectado';
        case 'disconnected': return 'Desconectado';
        default: return 'Desconhecido';
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Micro-servidor WhatsApp rodando em http://localhost:${PORT}`);
    connectToWhatsApp();
});