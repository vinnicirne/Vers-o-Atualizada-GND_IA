
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    GEMINI_API_KEY: string;
    API_KEY: string;
    MP_ACCESS_TOKEN: string; // Backend/Edge Function only
    ASAAS_KEY: string; // Backend/Edge Function only
    ASAAS_API_BASE_URL: string; // Backend/Edge Function only
  }
}
