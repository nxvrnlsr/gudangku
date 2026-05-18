/**
 * Post-build script: copy Next.js static assets into the standalone folder
 * Run after `next build` so the standalone server can find its static files.
 * 
 * Next.js standalone docs require:
 *   .next/static  → .next/standalone/.next/static
 *   public/       → .next/standalone/public
 */
const fs   = require('fs');
const path = require('path');

const frontendDir  = path.join(__dirname, '..', 'frontend');
const standaloneDir = path.join(frontendDir, '.next', 'standalone');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) { console.log(`SKIP (not found): ${src}`); return; }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[postbuild] Copying .next/static → standalone/.next/static ...');
copyDir(
  path.join(frontendDir, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static')
);

console.log('[postbuild] Copying public/ → standalone/public ...');
copyDir(
  path.join(frontendDir, 'public'),
  path.join(standaloneDir, 'public')
);

console.log('[postbuild] Done. Standalone is self-contained.');
