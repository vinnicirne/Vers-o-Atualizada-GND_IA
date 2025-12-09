
import { api } from './api';
import { supabase } from './supabaseClient';
import { ChatConnection } from '../types'; // Added import

// ... existing code ...

// --- REAL EXTERNAL API HELPERS ---

export const fetchRemoteQrCode = async (connection: ChatConnection): Promise<string | null> => {
    if (!connection.external_api_url) return null;

    try {
        // Remove trailing slash
        const baseUrl = connection.external_api_url.replace(/\/$/, '');
        
        const headers: any = { 'Content-Type': 'application/json' };
        if (connection.external_api_token) headers['apikey'] = connection.external_api_token;
        // Also support 'Accept' for our new micro-server to return JSON
        headers['Accept'] = 'application/json';

        // 1. Try Micro-server Endpoint (/qr)
        try {
            const res = await fetch(`${baseUrl}/qr`, { method: 'GET', headers });
            if (res.ok) {
                const data = await res.json();
                // Micro-server returns { base64: "data:image..." } or { qr: "code" }
                if (data.base64) return data.base64; 
                if (data.qr) return data.qr; // Raw string to be converted if needed, but component handles data uri
            }
        } catch(e) {
            // Ignore and fall through to Evolution API
        }

        // 2. Try Evolution API v2 Endpoint (/instance/connect/{session})
        const url = `${baseUrl}/instance/connect/${connection.session_name}`;
        const res = await fetch(url, { method: 'GET', headers });
        if (!res.ok) return null;

        const data = await res.json();
        return data.base64 || data.qrcode || null;
    } catch (e) {
        console.error("Erro ao buscar QR Code externo:", e);
        return null;
    }
};

export const fetchRemoteStatus = async (connection: ChatConnection): Promise<'connected' | 'disconnected' | 'qrcode' | null> => {
    if (!connection.external_api_url) return null;

    try {
        const baseUrl = connection.external_api_url.replace(/\/$/, '');
        const headers: any = { 'Content-Type': 'application/json' };
        if (connection.external_api_token) headers['apikey'] = connection.external_api_token;

        // 1. Try Micro-server Endpoint (/status)
        try {
            const res = await fetch(`${baseUrl}/status`, { method: 'GET', headers });
            if (res.ok) {
                const data = await res.json();
                const st = data.status;
                if (st === 'connected') return 'connected';
                if (st === 'qr_required') return 'qrcode';
                if (st === 'disconnected') return 'disconnected';
            }
        } catch(e) {
            // Ignore
        }

        // 2. Try Evolution API v2 Endpoint
        const url = `${baseUrl}/instance/connectionState/${connection.session_name}`;
        const res = await fetch(url, { method: 'GET', headers });
        if (!res.ok) return null;

        const data = await res.json();
        const state = data.instance?.state || data.state;
        
        if (state === 'open') return 'connected';
        if (state === 'connecting') return 'qrcode';
        if (state === 'close') return 'disconnected';
        
        return null;
    } catch (e) {
        return null;
    }
};
