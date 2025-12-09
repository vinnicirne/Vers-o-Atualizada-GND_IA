
import { api } from './api';
import { supabase } from './supabaseClient';
import { ChatConnection } from '../types';

export const fetchRemoteQrCode = async (connection: ChatConnection): Promise<string | null> => {
    if (!connection.external_api_url) return null;

    try {
        const baseUrl = connection.external_api_url.replace(/\/$/, '');
        const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (connection.external_api_token) headers['apikey'] = connection.external_api_token;

        try {
            const res = await fetch(`${baseUrl}/qr`, { method: 'GET', headers });
            if (res.ok) {
                const data = await res.json();
                if (data.base64) return data.base64; 
                if (data.qr) return data.qr;
            }
        } catch(e) {}

        // Fallback Evolution API logic if needed...
        return null;
    } catch (e) {
        return null;
    }
};

export const fetchRemoteStatus = async (connection: ChatConnection): Promise<'connected' | 'disconnected' | 'qrcode' | null> => {
    if (!connection.external_api_url) return null;

    try {
        const baseUrl = connection.external_api_url.replace(/\/$/, '');
        const headers: any = { 'Content-Type': 'application/json' };
        
        try {
            const res = await fetch(`${baseUrl}/status`, { method: 'GET', headers });
            if (res.ok) {
                const data = await res.json();
                return data.status; // micro-server returns 'connected', 'disconnected', etc directly
            }
        } catch(e) {}
        
        return null;
    } catch (e) {
        return null;
    }
};

export const sendTextMessage = async (connection: ChatConnection, number: string, message: string) => {
    if (!connection.external_api_url) throw new Error("URL da API não configurada.");
    
    const baseUrl = connection.external_api_url.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, message })
    });
    
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao enviar mensagem.");
    }
    
    return true;
};
