import { api } from './api';
import { ApiKey } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const listApiKeys = async (userId: string): Promise<ApiKey[]> => {
  const { data, error } = await api.select('api_keys', { user_id: userId });
  // Fallback se a tabela não existir ainda para não quebrar a UI
  if (error && (typeof error === 'string' && error.includes('does not exist'))) return [];
  if (error) throw new Error(error);
  return data || [];
};

export const createApiKey = async (userId: string, name: string): Promise<ApiKey> => {
  // Gera uma chave segura (Simulação)
  const randomPart = uuidv4().replace(/-/g, '') + Math.random().toString(36).substring(2);
  const fullKey = `gdn_live_${randomPart}`;
  const prefix = `gdn_live_...${fullKey.slice(-4)}`;

  const newKey: ApiKey = {
    id: uuidv4(),
    user_id: userId,
    name,
    key_prefix: prefix,
    full_key: fullKey, // Campos virtuais que não persistem no banco idealmente, mas aqui simulamos o retorno
    created_at: new Date().toISOString(),
    status: 'active'
  };

  const { data, error } = await api.insert('api_keys', {
    user_id: userId,
    name: name,
    key_prefix: prefix,
    status: 'active',
    // Em produção, salvaríamos o hash. Aqui salvamos metadados.
  });

  if (error) throw new Error(error);

  return newKey;
};

export const revokeApiKey = async (keyId: string) => {
  const { error } = await api.delete('api_keys', { id: keyId });
  if (error) throw new Error(error);
};