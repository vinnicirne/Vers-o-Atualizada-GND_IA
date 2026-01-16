-- SUPABASE DATABASE SCHEMA - GDN_IA PRO
-- Last Update: 2026-01-16

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'editor', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE news_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'active',
    plan TEXT DEFAULT 'free',
    affiliate_code TEXT UNIQUE,
    referred_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    affiliate_balance NUMERIC(10,2) DEFAULT 0,
    asaas_customer_id TEXT,
    mercadopago_customer_id TEXT,
    subscription_id TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Credits
CREATE TABLE IF NOT EXISTS user_credits (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    credits INTEGER DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation History (News, Images, etc)
CREATE TABLE IF NOT EXISTS news (
    id BIGSERIAL PRIMARY KEY,
    author_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    conteudo TEXT,
    tipo TEXT,
    sources JSONB DEFAULT '[]',
    status news_status DEFAULT 'approved',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions & Payments
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    valor NUMERIC(10,2) NOT NULL,
    metodo TEXT, -- 'pix', 'card'
    status TEXT, -- 'pending', 'approved', 'failed', 'refunded'
    external_id TEXT,
    metadata JSONB DEFAULT '{}',
    data TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Commission Logs
CREATE TABLE IF NOT EXISTS affiliate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    source_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Configuration (Plans, Gateways, AI Settings)
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES app_users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modals & Popups
CREATE TABLE IF NOT EXISTS system_popups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    content TEXT,
    type TEXT, -- 'text', 'image', 'video'
    media_url TEXT,
    style JSONB DEFAULT '{}',
    trigger_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT, -- 'info', 'success', 'warning', 'error'
    is_read BOOLEAN DEFAULT FALSE,
    action_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security: Allowed Domains
CREATE TABLE IF NOT EXISTS allowed_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    detalhes JSONB DEFAULT '{}',
    data TIMESTAMPTZ DEFAULT NOW()
);

-- AI Usage Logs (Tokens/Costs)
CREATE TABLE IF NOT EXISTS ai_logs (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    modelo_id TEXT,
    tokens INTEGER DEFAULT 0,
    custo NUMERIC(10,6) DEFAULT 0,
    data TIMESTAMPTZ DEFAULT NOW()
);

-- CRM: Leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'customer', 'lost'
    score INTEGER DEFAULT 0,
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM: Deals
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'open', -- 'open', 'won', 'lost'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FUNCTIONS & TRIGGERS

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user setup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Create Profile in app_users
    INSERT INTO public.app_users (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
    );

    -- 2. Create Initial Credits
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 10);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
