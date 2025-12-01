
import { api } from './api';
import { ApiKey } from '../types';
import JSZip from 'jszip';
import { supabaseUrl } from './supabaseClient'; // Only supabaseUrl is needed for client-side plugin

// Helper simples para gerar UUID v4 sem dependência externa
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper para fragmentar strings longas em pedaços menores para o PHP
// Isso evita bloqueios de WAF (ModSecurity/Wordfence) que impedem upload de arquivos contendo strings longas de alta entropia.
// NOTA: Como não estamos mais injetando a chave GEMINI_API_KEY diretamente aqui,
// este helper é menos crítico para a segurança, mas ainda útil para a SUPABASE_ANON_KEY no plugin.
function splitForPhp(str: string, chunkSize: number = 15): string {
    if (!str) return "''";
    const chunks = str.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];
    return chunks.map(c => `'${c}'`).join(' . ');
}

export const listApiKeys = async (userId: string): Promise<ApiKey[]> => {
  const { data, error } = await api.select('api_keys', { user_id: userId });
  if (error) {
      if (typeof error === 'string' && (error.includes('does not exist') || error.includes('404'))) {
          console.warn("Tabela api_keys não encontrada.");
          throw new Error('TABLE_NOT_FOUND');
      }
      throw new Error(typeof error === 'object' ? error.message : error);
  }
  return data || [];
};

export const createApiKey = async (userId: string, name: string): Promise<ApiKey> => {
  const randomPart = generateUUID().replace(/-/g, '') + Math.random().toString(36).substring(2);
  const fullKey = `gdn_live_${randomPart}`;
  const prefix = `gdn_live_...${fullKey.slice(-4)}`;
  const newId = generateUUID();

  const newKey: ApiKey = {
    id: newId,
    user_id: userId,
    name,
    key_prefix: prefix,
    full_key: fullKey, 
    created_at: new Date().toISOString(),
    status: 'active'
  };

  const { error } = await api.insert('api_keys', {
    id: newId,
    user_id: userId,
    name: name,
    key_prefix: prefix,
    key_hash: fullKey, 
    status: 'active',
  });

  if (error) {
      console.error("Erro ao criar API Key:", error);
      if (typeof error === 'string' && error.includes('does not exist')) {
          throw new Error('TABLE_NOT_FOUND');
      }
      throw new Error(typeof error === 'object' ? error.message : error);
  }

  return newKey;
};

export const revokeApiKey = async (keyId: string) => {
  const { error } = await api.delete('api_keys', { id: keyId });
  if (error) throw new Error(typeof error === 'object' ? error.message : error);
};

export const generateWordPressPluginZip = async () => { // Removed userGeminiKey parameter
    const zip = new JSZip();
    const pluginFolder = zip.folder("gdn-poster-pro");
    const templatesFolder = pluginFolder?.folder("templates");
    const assetsFolder = pluginFolder?.folder("assets");
    const cssFolder = assetsFolder?.folder("css");
    const jsFolder = assetsFolder?.folder("js");

    // NOTA DE SEGURANÇA:
    // A GEMINI_KEY do usuário NÃO É MAIS INJETADA DIRETAMENTE NO PLUGIN.
    // O plugin agora chama uma Edge Function do Supabase (wp-gemini-proxy) para gerar conteúdo.
    // Esta Edge Function usa a GEMINI_API_KEY do SERVIDOR, nunca do cliente.
    
    // A SUPABASE_ANON_KEY também não será mais hardcoded.
    // O usuário deverá configurar a Supabase URL e ANON KEY no painel de admin do WP.
    // Isso é mais seguro e flexível.
    const phpSupabaseUrlPlaceholder = 'get_option(\'gdn_supabase_url\', \'\')';
    const phpSupabaseAnonKeyPlaceholder = 'get_option(\'gdn_supabase_anon_key\', \'\')';
    // Nova placeholder para a URL do proxy Gemini
    const phpWpGeminiProxyUrlPlaceholder = 'get_option(\'gdn_supabase_gemini_proxy_url\', \'\')';
    
    // 1. MAIN PLUGIN FILE (PHP)
    const mainFileContent = `<?php
/*
Plugin Name: GDN_IA - Poster Pro
Description: Sistema de geração de notícias com IA. Versão 1.5.7 com correções de segurança SSL e AI Proxy.
Version: 1.5.7
Author: GDN_IA Team
*/

if (!defined('ABSPATH')) {
    exit;
}

class NoticiasPosterGDN {
    
    private $supabase_url;
    private $supabase_key; // Renomeado para anon_key
    private $wp_gemini_proxy_url; // Nova URL da Edge Function
    
    private $token_key = 'gdn_access_token';
    private $uid_key = 'gdn_user_id';
    private $email_key = 'gdn_user_email';
    
    public function __construct() {
        // Configuração do SISTEMA
        $this->supabase_url = ${phpSupabaseUrlPlaceholder};
        $this->supabase_key = ${phpSupabaseAnonKeyPlaceholder}; // Anonymous key para auth e RLS
        $this->wp_gemini_proxy_url = ${phpWpGeminiProxyUrlPlaceholder}; // URL da Edge Function (agora configurável)
        
        add_action('admin_menu', array($this, 'adicionar_menu_poster'));
        add_action('admin_init', array($this, 'restringir_acesso_poster'));
        
        // Adiciona configurações do plugin
        add_action('admin_init', array($this, 'register_gdn_settings'));

        add_action('wp_ajax_gdn_login', array($this, 'ajax_login'));
        add_action('wp_ajax_gdn_check_credits', array($this, 'ajax_check_credits'));
        add_action('wp_ajax_gdn_generate', array($this, 'ajax_generate'));
        add_action('wp_ajax_gdn_logout', array($this, 'ajax_logout'));
        add_action('wp_ajax_gdn_publish', array($this, 'ajax_publish'));
        add_action('wp_ajax_gdn_delete', array($this, 'ajax_delete'));
        
        add_filter('pre_get_posts', array($this, 'filtrar_posts_por_autor'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    public function register_gdn_settings() {
        register_setting('gdn_options_group', 'gdn_supabase_url');
        register_setting('gdn_options_group', 'gdn_supabase_anon_key');
        register_setting('gdn_options_group', 'gdn_supabase_gemini_proxy_url'); // Novo campo para a URL do proxy Gemini
        
        add_settings_section(
            'gdn_general_settings_section',
            'Configurações Gerais GDN_IA',
            array($this, 'gdn_general_settings_section_callback'),
            'gdn-poster'
        );

        add_settings_field(
            'gdn_supabase_url_field',
            'URL do Supabase',
            array($this, 'gdn_supabase_url_callback'),
            'gdn-poster',
            'gdn_general_settings_section'
        );

        add_settings_field(
            'gdn_supabase_anon_key_field',
            'Supabase Anon Key',
            array($this, 'gdn_supabase_anon_key_callback'),
            'gdn-poster',
            'gdn_general_settings_section'
        );

        add_settings_field(
            'gdn_supabase_gemini_proxy_url_field', // Novo campo
            'URL do Proxy Gemini',
            array($this, 'gdn_supabase_gemini_proxy_url_callback'),
            'gdn-poster',
            'gdn_general_settings_section'
        );
    }

    public function gdn_general_settings_section_callback() {
        echo '<p>Configure as credenciais do seu projeto Supabase para que o plugin possa se autenticar e usar a IA.</p>';
    }

    public function gdn_supabase_url_callback() {
        $setting = get_option('gdn_supabase_url');
        echo "<input type='url' name='gdn_supabase_url' value='" . esc_attr($setting) . "' class='regular-text' placeholder='https://your-project-id.supabase.co'>";
        echo "<p class='description'>A URL do seu projeto Supabase (ex: https://abcde.supabase.co).</p>";
    }

    public function gdn_supabase_anon_key_callback() {
        $setting = get_option('gdn_supabase_anon_key');
        echo "<input type='text' name='gdn_supabase_anon_key' value='" . esc_attr($setting) . "' class='regular-text' placeholder='eyJhbGciOiJIUzI1NiI...'>";
        echo "<p class='description'>Sua chave pública (anon key) do Supabase. Esta chave é segura para ser exposta no cliente. NUNCA use a Service Role Key aqui.</p>";
    }

    public function gdn_supabase_gemini_proxy_url_callback() { // Novo callback
        $setting = get_option('gdn_supabase_gemini_proxy_url', '${supabaseUrl}/functions/v1/wp-gemini-proxy'); // Default para a URL do proxy atual
        echo "<input type='url' name='gdn_supabase_gemini_proxy_url' value='" . esc_attr($setting) . "' class='regular-text' placeholder='https://your-project-id.supabase.co/functions/v1/wp-gemini-proxy'>";
        echo "<p class='description'>A URL da Edge Function que proxy a API Gemini. Geralmente: <code>SUAPRASE_URL/functions/v1/wp-gemini-proxy</code></p>";
    }
    
    public function adicionar_menu_poster() {
        add_menu_page(
            'GDN Poster',
            'GDN Poster',
            'edit_posts',
            'gdn-poster',
            array($this, 'pagina_poster'),
            'dashicons-superhero',
            30
        );
        // Adiciona sub-menu de configurações
        add_submenu_page(
            'gdn-poster',
            'Configurações GDN_IA',
            'Configurações',
            'manage_options',
            'gdn-poster-settings',
            array($this, 'gdn_settings_page_content')
        );
    }

    public function gdn_settings_page_content() {
        ?>
        <div class="wrap">
            <h1>Configurações GDN_IA</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('gdn_options_group');
                do_settings_sections('gdn-poster');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
    
    public function enqueue_assets($hook) {
        if ($hook !== 'toplevel_page_gdn-poster') return;
        wp_enqueue_script('jquery');
        wp_enqueue_style('gdn-css', plugin_dir_url(__FILE__) . 'assets/css/poster-admin.css', array(), '1.5.7');
        wp_enqueue_script('gdn-js', plugin_dir_url(__FILE__) . 'assets/js/poster-admin.js', array('jquery'), '1.5.7', true);
        wp_localize_script('gdn-js', 'gdn_ajax', array('ajax_url' => admin_url('admin-ajax.php')));
    }
    
    public function restringir_acesso_poster() {
        if (isset($_GET['page']) && $_GET['page'] === 'gdn-poster' && !current_user_can('edit_posts')) {
            wp_die('Permissão negada.');
        }
    }
    
    public function pagina_poster() {
        include plugin_dir_path(__FILE__) . 'templates/poster-interface.php';
    }
    
    public function filtrar_posts_por_autor($query) {
        if (is_admin() && isset($_GET['page']) && $_GET['page'] === 'gdn-poster' && $query->is_main_query()) {
            $query->set('author', get_current_user_id());
        }
        return $query;
    }
    
    private function supabase_request($endpoint, $method = 'GET', $body = null, $token = null) {
        if (empty($this->supabase_url) || empty($this->supabase_key)) {
            return array('error' => 'URL ou Anon Key do Supabase não configuradas no plugin. Acesse Configurações > GDN Poster > Configurações para definir.');
        }

        $url = $this->supabase_url . $endpoint;
        $headers = array(
            'apikey' => $this->supabase_key,
            'Content-Type' => 'application/json'
        );
        
        if ($token) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }
        
        $args = array(
            'method' => $method,
            'headers' => $headers,
            'timeout' => 20,
            'sslverify' => true // Segurança ativada
        );
        
        if ($body) {
            $args['body'] = json_encode($body);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return array('error' => 'Erro WP: ' . $response->get_error_message());
        }
        
        $code = wp_remote_retrieve_response_code($response);
        $body_response = wp_remote_retrieve_body($response);
        $data = json_decode($body_response, true);
        
        if ($code >= 400) {
            if (json_last_error() !== JSON_ERROR_NONE) {
                return array('error' => 'Erro HTTP ' . $code . ': ' . substr($body_response, 0, 100));
            }
            return $data;
        }
        
        return $data;
    }
    
    public function ajax_login() {
        $email = sanitize_email($_POST['email']);
        $password = $_POST['password'];
        
        $response = $this->supabase_request('/auth/v1/token?grant_type=password', 'POST', array(
            'email' => $email,
            'password' => $password
        ));
        
        if (isset($response['error']) || isset($response['error_description']) || isset($response['msg'])) {
            $msg = 'Erro desconhecido';
            if (isset($response['error_description'])) $msg = $response['error_description'];
            elseif (isset($response['msg'])) $msg = $response['msg'];
            elseif (isset($response['error']) && is_string($response['error'])) $msg = $response['error'];
            
            if (strpos($msg, 'Invalid login credentials') !== false) {
                $msg = 'E-mail ou senha incorretos.';
            }
            wp_send_json_error($msg);
        }
        
        if (isset($response['access_token'])) {
            update_user_meta(get_current_user_id(), $this->token_key, $response['access_token']);
            update_user_meta(get_current_user_id(), $this->uid_key, $response['user']['id']);
            update_user_meta(get_current_user_id(), $this->email_key, $response['user']['email']);
            wp_send_json_success('Login realizado!');
        } else {
            wp_send_json_error('Resposta inválida do servidor.');
        }
    }
    
    public function ajax_check_credits() {
        $token = get_user_meta(get_current_user_id(), $this->token_key, true);
        $uid = get_user_meta(get_current_user_id(), $this->uid_key, true);
        $email = get_user_meta(get_current_user_id(), $this->email_key, true);
        
        if (!$token || !$uid) wp_send_json_error('Não logado.');
        
        $data = $this->supabase_request("/rest/v1/user_credits?user_id=eq.{$uid}&select=credits", 'GET', null, $token);
        
        if (isset($data['error'])) wp_send_json_error('Erro ao verificar créditos.');
        
        $credits = (is_array($data) && count($data) > 0) ? $data[0]['credits'] : 0;
        
        wp_send_json_success(array('credits' => $credits, 'email' => $email));
    }
    
    public function ajax_generate() {
        $token = get_user_meta(get_current_user_id(), $this->token_key, true);
        $uid = get_user_meta(get_current_user_id(), $this->uid_key, true);
        
        if (empty($this->wp_gemini_proxy_url)) { // Verifica se a URL do proxy Gemini está configurada
            wp_send_json_error('URL do Proxy Gemini não configurada no plugin. Acesse Configurações para definir.');
        }

        if (!$token) wp_send_json_error('Sessão expirada. Faça login novamente.');
        
        // NO LONGER DIRECTLY CALLING GEMINI API FROM PHP
        // Instead, proxying to a Supabase Edge Function that handles the API Key securely.
        
        $theme = sanitize_text_field($_POST['theme']);
        
        $proxy_payload = array(
            'prompt' => $theme,
            'mode' => 'news_generator', // Specify the mode for the Edge Function
            'userId' => $uid,
            // No need to pass generateAudio or other options as WP plugin only does news
        );

        $response = wp_remote_post($this->wp_gemini_proxy_url, array(
            'body' => json_encode($proxy_payload),
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $token // Pass user's JWT to Edge Function for auth and RLS
            ),
            'timeout' => 90,
            'sslverify' => true
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error('Erro de conexão com o serviço de IA: ' . $response->get_error_message());
        }
        
        $body_raw = wp_remote_retrieve_body($response);
        $ai_response = json_decode($body_raw, true);

        if (isset($ai_response['error'])) {
            wp_send_json_error('Erro na geração de IA: ' . $ai_response['error']);
        }
        
        $text = $ai_response['text'] ?? null;
        $sources = $ai_response['sources'] ?? []; // Extract sources if provided by Edge Function
        
        if (!$text) {
            wp_send_json_error('O serviço de IA não gerou texto.');
        }
        
        // Parse the text which should be already in a predictable format from the Edge Function
        // The Edge Function simplifies output, so we don't need complex parsing here.
        // Assuming the Edge Function returns plain text in a structure like:
        // TITLE: ...
        // KEYWORD: ...
        // META: ...
        // CONTENT: ...
        $lines = explode("\\n", $text);
        $lines = array_values(array_filter($lines, function($line) { return trim($line) !== ''; }));
        
        $title = "Notícia Gerada";
        $keyword = "";
        $meta_desc = "";
        $content = "";

        // Attempt to parse based on expected format from Edge Function
        if (count($lines) >= 4) {
            $title = trim(preg_replace('/^(Linha 1:|\[TÍTULO\]|Título:)/i', '', $lines[0]));
            $keyword = trim(preg_replace('/^(Linha 2:|\[KEYWORD\]|Keyword:)/i', '', $lines[1]));
            $meta_desc = trim(preg_replace('/^(Linha 3:|\[META\]|Meta:)/i', '', $lines[2]));
            $content_lines = array_slice($lines, 3);
            if (!empty($content_lines) && preg_match('/^(Linha 4:|\[CONTEÚDO\]|Conteúdo:)/i', $content_lines[0])) {
                $content_lines[0] = preg_replace('/^(Linha 4:|\[CONTEÚDO\]|Conteúdo:)/i', '', $content_lines[0]);
            }
            $content = implode("\\n", $content_lines);
        } else {
            // Fallback parsing if format is not strict (shouldn't happen with proper Edge Function output)
            $title = $lines[0] ?? $theme;
            $content = implode("\\n", array_slice($lines, 1));
            $keyword = $theme;
            $meta_desc = wp_trim_words($content, 25);
        }
        
        $title = str_replace(array('*', '#', '<h1>', '</h1>'), '', $title);
        
        $post_id = wp_insert_post(array(
            'post_title' => $title,
            'post_content' => $content,
            'post_status' => 'draft',
            'post_author' => get_current_user_id()
        ));
        
        if (!$post_id) wp_send_json_error('Erro ao salvar no WordPress.');
        
        update_post_meta($post_id, '_gdn_generated', 'true');
        $this->aplicar_seo_avancado($post_id, $title, $meta_desc, $keyword);
        
        // Credit deduction is now handled by the wp-gemini-proxy Edge Function
        // Remove: if ($current_credits !== -1) { $this->supabase_request("/rest/v1/user_credits?user_id=eq.{$uid}", 'PATCH', array('credits' => $current_credits - 1), $token); }
        
        wp_send_json_success(array('post_id' => $post_id, 'message' => 'Notícia gerada com sucesso!'));
    }
    
    public function ajax_logout() {
        delete_user_meta(get_current_user_id(), $this->token_key);
        delete_user_meta(get_current_user_id(), $this->uid_key);
        delete_user_meta(get_current_user_id(), $this->email_key);
        wp_send_json_success();
    }
    
    public function ajax_publish() {
        $id = intval($_POST['id']);
        wp_update_post(array('ID' => $id, 'post_status' => 'publish'));
        wp_send_json_success();
    }
    
    public function ajax_delete() {
        $id = intval($_POST['id']);
        wp_delete_post($id, true);
        wp_send_json_success();
    }
    
    private function aplicar_seo_avancado($post_id, $title, $desc, $keyword) {
        update_post_meta($post_id, '_yoast_wpseo_title', $title);
        update_post_meta($post_id, '_yoast_wpseo_metadesc', $desc);
        update_post_meta($post_id, '_yoast_wpseo_focuskw', $keyword);
        update_post_meta($post_id, 'rank_math_title', $title);
        update_post_meta($post_id, 'rank_math_description', $desc);
        update_post_meta($post_id, 'rank_math_focus_keyword', $keyword);
        if (!has_term('', 'category', $post_id)) { wp_set_post_categories($post_id, array(1)); }
    }
}

new NoticiasPosterGDN();

function gdn_get_user_posts() {
    return get_posts(array(
        'author' => get_current_user_id(),
        'post_status' => array('draft', 'publish'),
        'posts_per_page' => 10,
    ));
}
`;

    // 2. TEMPLATE FILE
    const templateContent = `
<div class="wrap gdn-wrap">
    <div class="gdn-header">
        <h1><span class="dashicons dashicons-superhero"></span> GDN_IA Poster Pro</h1>
        <p>Sistema v1.5.7</p>
    </div>
    
    <?php
    $token = get_user_meta(get_current_user_id(), 'gdn_access_token', true);
    $supabase_url_configured = get_option('gdn_supabase_url');
    $supabase_anon_key_configured = get_option('gdn_supabase_anon_key');
    $supabase_gemini_proxy_url_configured = get_option('gdn_supabase_gemini_proxy_url');
    
    if (empty($supabase_url_configured) || empty($supabase_anon_key_configured) || empty($supabase_gemini_proxy_url_configured)) {
        ?>
        <div class="gdn-card error-card">
            <h2>Configuração Necessária</h2>
            <p>Por favor, acesse o menu <a href="<?php echo admin_url('admin.php?page=gdn-poster-settings'); ?>">GDN Poster > Configurações</a> para inserir as credenciais do Supabase e a URL do Proxy Gemini.</p>
            <p>Sem estas credenciais, o plugin não conseguirá se comunicar com a plataforma GDN_IA.</p>
            <p class="description">Você pode encontrar sua URL e Anon Key do Supabase no painel do seu projeto Supabase, em Configurações do Projeto > API.</p>
            <p class="description">A Supabase Anon Key é segura para ser exposta no cliente. NUNCA use a Service Role Key aqui.</p>
            <p class="description">A URL do Proxy Gemini é a URL da sua Edge Function <code>wp-gemini-proxy</code>.</p>
        </div>
        <?php
    } else {
    ?>
    
    <div id="gdn-app" data-logged="<?php echo $token ? 'true' : 'false'; ?>">
        <div id="view-login" style="display: <?php echo $token ? 'none' : 'block'; ?>;">
            <div class="gdn-card login-card">
                <h2>Conectar Usuário</h2>
                <form id="form-login">
                    <label>E-mail da Conta GDN</label>
                    <input type="email" id="gdn-email" required placeholder="seu@email.com">
                    <label>Senha</label>
                    <input type="password" id="gdn-pass" required placeholder="••••••••">
                    <button type="submit" class="button button-primary button-hero">Autenticar Usuário</button>
                </form>
                <p class="gdn-footer-text">Conecta sua conta de créditos GDN ao WordPress.</p>
            </div>
        </div>
        
        <div id="view-dashboard" style="display: <?php echo $token ? 'block' : 'none'; ?>;">
            <div class="gdn-status-bar">
                <div class="status-item user-info">
                    <span class="dashicons dashicons-admin-users"></span>
                    <div><span class="label">Usuário:</span><span id="user-email-display" class="value">...</span></div>
                </div>
                <div class="status-item credits-info">
                    <span class="dashicons dashicons-tickets-alt"></span>
                    <div><span class="label">Saldo:</span><span id="credits-display" class="value">...</span></div>
                </div>
                <button id="btn-logout" class="button button-link" style="color:#d63638;">Sair</button>
            </div>
            
            <div class="gdn-card generator-card">
                <h2><span class="dashicons dashicons-edit"></span> Gerar Nova Notícia</h2>
                <div class="gdn-input-group">
                    <input type="text" id="gdn-theme" placeholder="Digite o tema..." class="large-text">
                    <button id="btn-generate" class="button button-primary button-hero">Gerar (1 Crédito)</button>
                </div>
                <div id="loading-bar" style="display:none;">
                    <div class="spinner is-active" style="float:none; margin: 0 auto 10px;"></div>
                    <p>A IA está trabalhando no seu pedido...</p>
                </div>
            </div>
            
            <div class="gdn-card">
                <h3>Histórico</h3>
                <div id="gdn-post-list">
                    <?php 
                    $posts = gdn_get_user_posts(); 
                    if ($posts):
                        foreach ($posts as $post): 
                            $is_ai = get_post_meta($post->ID, '_gdn_generated', true);
                            ?>
                            <div class="gdn-post-row" id="post-<?php echo $post->ID; ?>">
                                <div class="post-info">
                                    <strong><?php echo esc_html($post->post_title); ?></strong>
                                    <span class="status-pill <?php echo $post->post_status; ?>"><?php echo ucfirst($post->post_status); ?></span>
                                </div>
                                <div class="post-actions">
                                    <a href="<?php echo get_edit_post_link($post->ID); ?>" class="button" target="_blank">Editar</a>
                                    <?php if($post->post_status == 'draft'): ?>
                                        <button class="button button-primary btn-publish" data-id="<?php echo $post->ID; ?>">Publicar</button>
                                    <?php endif; ?>
                                    <button class="button button-link-delete btn-delete" data-id="<?php echo $post->ID; ?>">Excluir</button>
                                </div>
                            </div>
                        <?php endforeach;
                    else: ?>
                        <p style="text-align:center; color:#888;">Nenhuma notícia encontrada.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <?php } // Fim do else de configuração ?>
</div>
`;

    // 3. CSS FILE
    const cssContent = `
.gdn-wrap { max-width: 900px; margin: 20px auto; font-family: sans-serif; }
.gdn-header { margin-bottom: 30px; text-align: center; }
.gdn-card { background: #fff; border: 1px solid #ccd0d4; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 25px; }
.login-card { max-width: 400px; margin: 0 auto; text-align: center; }
.login-card input { width: 100%; margin-bottom: 15px; padding: 10px; font-size: 16px; border: 1px solid #ddd; border-radius: 4px; }
.gdn-status-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 15px 20px; border-radius: 8px; border: 1px solid #ccd0d4; margin-bottom: 20px; }
.status-item { display: flex; align-items: center; gap: 12px; }
.generator-card { text-align: center; border-top: 4px solid #2271b1; }
.gdn-input-group { display: flex; gap: 10px; margin-top: 20px; }
.gdn-input-group input { flex-grow: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 4px; }
.button-hero { padding: 10px 25px !important; height: auto !important; font-size: 16px !important; }
.gdn-post-row { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; }
.status-pill { font-size: 10px; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
.status-pill.draft { background: #f0f0f1; color: #50575e; }
.status-pill.publish { background: #edfaef; color: #008a20; }
#loading-bar { margin-top: 20px; padding: 20px; background: #f0f6fc; color: #1d2327; border-radius: 4px; }
.error-card { border-color: #d63638; border-left: 4px solid #d63638; background-color: #ffecec; color: #d63638; padding: 20px; text-align: left; }
.error-card h2 { color: #d63638; margin-top: 0; }
.error-card a { color: #007cba; text-decoration: underline; }
`;

    // 4. JS FILE
    const jsContent = `
jQuery(document).ready(function($) {
    function refreshCredits() {
        // Verifica se a URL e a Anon Key do Supabase estão configuradas no plugin antes de fazer a requisição
        const supabaseUrl = $('#gdn_supabase_url').val() || ''; // Assume que gdn_ajax.supabase_url não existe mais
        const supabaseAnonKey = $('#gdn_supabase_anon_key').val() || ''; // Assume que gdn_ajax.supabase_key não existe mais
        const supabaseGeminiProxyUrl = $('#gdn_supabase_gemini_proxy_url').val() || '';

        if (!supabaseUrl || !supabaseAnonKey || !supabaseGeminiProxyUrl) {
            $('#credits-display').text('Não configurado');
            $('#user-email-display').text('Não configurado');
            return;
        }

        $.post(gdn_ajax.ajax_url, { action: 'gdn_check_credits' }, function(res) {
            if(res.success) {
                const credits = res.data.credits === -1 ? 'Ilimitado' : res.data.credits;
                $('#credits-display').html(credits);
                if(res.data.email) $('#user-email-display').text(res.data.email);
            } else {
                $('#credits-display').text('Erro');
                if(res.data && typeof res.data === 'string' && res.data.includes('Não logado')) {
                    $('#gdn-app').data('logged', false);
                    $('#view-dashboard').hide();
                    $('#view-login').show();
                }
            }
        });
    }

    if($('#gdn-app').data('logged')) refreshCredits();

    $('#form-login').on('submit', function(e) {
        e.preventDefault();
        const btn = $(this).find('button');
        btn.prop('disabled', true).text('Autenticando...');
        
        $.post(gdn_ajax.ajax_url, {
            action: 'gdn_login',
            email: $('#gdn-email').val(),
            password: $('#gdn-pass').val()
        }, function(res) {
            if(res.success) location.reload();
            else {
                alert('Erro: ' + (res.data.message || JSON.stringify(res.data)));
                btn.prop('disabled', false).text('Autenticar Usuário');
            }
        });
    });

    $('#btn-logout').click(function() {
        if(!confirm('Deseja desconectar?')) return;
        $.post(gdn_ajax.ajax_url, { action: 'gdn_logout' }, function() { location.reload(); });
    });

    $('#btn-generate').click(function() {
        const theme = $('#gdn-theme').val();
        if(!theme) return alert('Digite um tema!');
        
        $(this).prop('disabled', true);
        $('#loading-bar').slideDown();
        
        $.post(gdn_ajax.ajax_url, {
            action: 'gdn_generate',
            theme: theme
        }, function(res) {
            if(res.success) {
                alert('Sucesso! ' + res.data.message);
                location.reload();
            } else {
                // Ensure error message is readable
                const errorData = res.data;
                let errorMessage = 'Erro desconhecido na geração.';
                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData && errorData.error) { // From Edge Function
                    errorMessage = errorData.error;
                } else if (errorData) {
                    errorMessage = JSON.stringify(errorData);
                }
                alert('Erro: ' + errorMessage);
                $('#btn-generate').prop('disabled', false);
                $('#loading-bar').slideUp();
            }
        });
    });

    $('.btn-publish').click(function() {
        const id = $(this).data('id');
        if(!confirm('Publicar?')) return;
        $.post(gdn_ajax.ajax_url, { action: 'gdn_publish', id: id }, function() { location.reload(); });
    });

    $('.btn-delete').click(function() {
        const id = $(this).data('id');
        if(!confirm('Tem certeza?')) return;
        $.post(gdn_ajax.ajax_url, { action: 'gdn_delete', id: id }, function() { $('#post-'+id).fadeOut(); });
    });
});
`;

    pluginFolder?.file("gdn-poster.php", mainFileContent);
    templatesFolder?.file("poster-interface.php", templateContent);
    jsFolder?.file("poster-admin.js", jsContent);
    cssFolder?.file("poster-admin.css", cssContent);

    const content = await zip.generateAsync({type:"blob"});
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', "gdn-poster-pro-v1.5.7.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};