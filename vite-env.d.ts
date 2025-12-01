

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ASAAS_PUBLIC_KEY?: string; // Add if Asaas client-side SDK is used
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    // GEMINI_API_KEY removed from here as it's exclusively for Edge Functions.
    API_KEY: string; // This is a generic placeholder and should be clarified/removed if not used securely.
    MP_ACCESS_TOKEN: string; // Backend/Edge Function only
    ASAAS_KEY: string; // Backend/Edge Function only
    ASAAS_API_BASE_URL: string; // Backend/Edge Function only
    N8N_BASE_URL: string; // Backend/Edge Function only
    N8N_TOKEN: string; // Backend/Edge Function only
  }
}