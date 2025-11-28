
import { api } from './api';
import { ApiKey } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Credenciais REAIS para injectar no plugin (Copiadas do services/supabaseClient.ts)
const SUPABASE_URL = 'https://bckujotuhhkagcqfiyye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJja3Vqb3R1aGhrYWdjcWZpeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDk2NjUsImV4cCI6MjA3OTQ4NTY2NX0.CqbNZJeaThbQtolVOB1HVHfV1AT2gsWYS-ZTpUHGq2A';

export const listApiKeys = async (userId: string): Promise<ApiKey[]> => {
  const { data, error } = await api.select('api_keys', { user_id: userId });
  if (error && (typeof error === 'string' && error.includes('does not exist'))) return [];
  if (error) throw new Error(error);
  return data || [];
};

export const createApiKey = async (userId: string, name: string): Promise<ApiKey> => {
  // Gera uma chave segura (Exemplo: gdn_live_xxxxxxxx...)
  const randomPart = uuidv4().replace(/-/g, '') + Math.random().toString(36).substring(2);
  const fullKey = `gdn_live_${randomPart}`;
  const prefix = `gdn_live_...${fullKey.slice(-4)}`;

  const newKey: ApiKey = {
    id: uuidv4(),
    user_id: userId,
    name,
    key_prefix: prefix,
    full_key: fullKey, 
    created_at: new Date().toISOString(),
    status: 'active'
  };

  const { error } = await api.insert('api_keys', {
    user_id: userId,
    name: name,
    key_prefix: prefix,
    key_hash: fullKey, 
    status: 'active',
  });

  if (error) throw new Error(error);

  return newKey;
};

export const revokeApiKey = async (keyId: string) => {
  const { error } = await api.delete('api_keys', { id: keyId });
  if (error) throw new Error(error);
};

export const generateWordPressPluginZip = () => {
    const pluginName = "gdn-connector";
    const phpCode = `<?php
/**
 * Plugin Name: GDN_IA Connector
 * Description: Conecta seu WordPress ao sistema GDN_IA para importar notícias.
 * Version: 1.0.0
 * Author: GDN_IA Team
 */

if (!defined('ABSPATH')) exit;

// Adiciona Menu de Configuração
add_action('admin_menu', 'gdn_connector_menu');

function gdn_connector_menu() {
    add_options_page('GDN_IA Settings', 'GDN_IA Connector', 'manage_options', 'gdn-connector', 'gdn_connector_options');
}

function gdn_connector_options() {
    if (!current_user_can('manage_options'))  {
        wp_die( __('You do not have sufficient permissions to access this page.') );
    }
    
    // Salvar Configurações
    if (isset($_POST['gdn_api_key'])) {
        update_option('gdn_api_key', sanitize_text_field($_POST['gdn_api_key']));
        echo '<div class="updated"><p>Configurações salvas!</p></div>';
    }

    $api_key = get_option('gdn_api_key', '');
    
    // Configuração automática vinda do App
    $supabase_url = '${SUPABASE_URL}'; 
    $anon_key = '${SUPABASE_ANON_KEY}';

    ?>
    <div class="wrap">
        <h1>GDN_IA Connector</h1>
        <form method="post" action="">
            <table class="form-table">
                <tr valign="top">
                <th scope="row">GDN API Key</th>
                <td>
                    <input type="text" name="gdn_api_key" value="<?php echo esc_attr($api_key); ?>" style="width: 400px;" />
                    <p class="description">Gere esta chave no painel do GDN_IA (Aba Documentação > API/Devs).</p>
                </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <hr>
        <h2>Como usar</h2>
        <p>Use o shortcode <code>[gdn_news limit="5"]</code> para exibir as últimas notícias geradas.</p>
        <p>Status da Conexão: <strong><?php echo $api_key ? '<span style="color:green">Chave Configurada</span>' : '<span style="color:red">Pendente</span>'; ?></strong></p>
    </div>
    <?php
}

// Shortcode para listar notícias
add_shortcode('gdn_news', 'gdn_news_shortcode');

function gdn_news_shortcode($atts) {
    $a = shortcode_atts( array(
        'limit' => 5,
    ), $atts );

    $api_key = get_option('gdn_api_key');
    if (!$api_key) return 'GDN_IA: API Key não configurada.';

    // URL e Key do App
    $supabase_url = '${SUPABASE_URL}';
    $anon_key = '${SUPABASE_ANON_KEY}';
    
    // Rota da API Supabase
    $url = $supabase_url . '/rest/v1/news?select=*&status=eq.approved&order=criado_em.desc&limit=' . $a['limit'];
    
    $args = array(
        'headers' => array(
            'apikey' => $anon_key,
            'Authorization' => 'Bearer ' . $anon_key,
            'X-GDN-Key' => $api_key 
        )
    );

    $response = wp_remote_get($url, $args);

    if (is_wp_error($response)) {
        return 'Erro ao conectar ao GDN_IA.';
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body);

    if (empty($data)) return 'Nenhuma notícia encontrada.';

    $output = '<div class="gdn-news-list">';
    foreach ($data as $news) {
        $output .= '<div class="gdn-news-item">';
        $output .= '<h3>' . esc_html($news->titulo) . '</h3>';
        $output .= '<p>' . esc_html(substr($news->conteudo, 0, 150)) . '...</p>';
        $output .= '<small>Gerado em: ' . date('d/m/Y', strtotime($news->criado_em)) . '</small>';
        $output .= '</div><hr>';
    }
    $output .= '</div>';

    return $output;
}
`;

    // Criar Blob e Download
    const blob = new Blob([phpCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pluginName}.php`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
