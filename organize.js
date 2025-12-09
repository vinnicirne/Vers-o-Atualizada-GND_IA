
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'Vers-o-Atualizada-GND_IA-main');
const targetDir = __dirname;

function moveRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      moveRecursive(path.join(src, file), path.join(dest, file));
    });
    // Remove directory after empty
    try {
        if (src !== sourceDir) fs.rmdirSync(src);
    } catch (e) {}
  } else {
    // If file exists in root (target), overwrite it or skip? Overwrite to update.
    try {
        if (fs.existsSync(dest)) {
            fs.unlinkSync(dest);
        }
        fs.renameSync(src, dest);
        console.log(`Movido: ${path.relative(__dirname, dest)}`);
    } catch (e) {
        console.error(`Erro ao mover ${src}:`, e.message);
    }
  }
}

console.log("🚀 Iniciando organização da estrutura de pastas...");

if (fs.existsSync(sourceDir)) {
    moveRecursive(sourceDir, targetDir);
    // Tenta remover a pasta pai se estiver vazia
    try {
        fs.rmdirSync(sourceDir);
        console.log("✅ Pasta antiga removida.");
    } catch (e) {
        console.log("ℹ️ Nota: A pasta antiga pode não estar vazia, verifique manualmente.");
    }
    console.log("✨ Organização concluída! Todos os arquivos estão na raiz.");
} else {
    console.log("⚠️ Pasta 'Vers-o-Atualizada-GND_IA-main' não encontrada. O projeto já pode estar organizado.");
}
