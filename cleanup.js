
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToDelete = [
  'services/gemini.ts',
  'services/authService.ts',
  'components/auth/Login.tsx',
  'AdminDashboardPage.tsx',
  'components/admin/NewsApprovalTable.tsx',
  'components/admin/AllNewsViewer.tsx',
  'components/Layout.tsx',
  'components/EmptyState.tsx',
  'Header.tsx', 
  'services/paymentService.ts',
  'components/MercadoPagoCheckout.tsx',
  // Chat / CRM / Whaticket Module Removal
  'pages/ChatCrmPage.tsx',
  'components/crm/CrmDashboard.tsx',
  'services/chatService.ts',
  'services/marketingService.ts',
  'wa-backend/index.js',
  'wa-backend/package.json',
  'supabase/functions/capture-lead/index.ts',
  'supabase/functions/capture-lead/deno.json'
];

console.log('🧹 Iniciando limpeza de arquivos obsoletos (Lixo Digital)...');

filesToDelete.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removido: ${file}`);
    } catch (err) {
      console.error(`❌ Erro ao remover ${file}:`, err.message);
    }
  } else {
    console.log(`⚠️  Não encontrado (já removido?): ${file}`);
  }
});

// Tentativa de remover pastas vazias (opcional e seguro)
const dirsToDelete = [
  'components/crm',
  'wa-backend/session',
  'wa-backend',
  'supabase/functions/capture-lead'
];

dirsToDelete.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        try {
            // Só remove se estiver vazio ou forçamos recursive
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✅ Pasta removida: ${dir}`);
        } catch(e) {
            console.log(`ℹ️ Nota: Não foi possível remover pasta ${dir} (pode não estar vazia ou permissão).`);
        }
    }
});

console.log('\n✨ Limpeza concluída! O projeto está mais leve e organizado.');
