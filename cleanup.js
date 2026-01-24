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
<<<<<<< HEAD
  'Header.tsx', // Arquivo duplicado na raiz (o correto está em components/Header.tsx)
  'services/paymentService.ts', // Removido
  'components/MercadoPagoCheckout.tsx' // Removido
=======
  'Header.tsx',
  'services/paymentService.ts',
  'components/MercadoPagoCheckout.tsx',
  'services/ttsService.ts',
  'components/AudioPlayer.tsx',
  'components/tools/AudioForm.tsx'
>>>>>>> 6251f72d8007bb5129c739db5bb3def872df23aa
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

console.log('\n✨ Limpeza concluída! O projeto está mais leve e organizado.');