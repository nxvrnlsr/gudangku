/**
 * PM2 Wrapper untuk menjalankan Next.js dev server
 * PM2 hanya bisa spawn script Node.js secara langsung.
 * Script ini menggunakan child_process untuk menjalankan "npm run dev"
 */
const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

const child = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'pipe',        // 'pipe' agar kompatibel dengan windowsHide
  shell: true,
  windowsHide: true,    // Sembunyikan CMD window — hilangkan flash muncul/hilang
  env: { ...process.env, NODE_ENV: 'development' },
});

// Teruskan output ke PM2 log
child.stdout.on('data', (d) => process.stdout.write(d));
child.stderr.on('data', (d) => process.stderr.write(d));

child.on('error', (err) => {
  console.error('[frontend-runner] Error:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`[frontend-runner] Exited with code ${code}`);
  process.exit(code ?? 0);
});

// Forward kill signals agar PM2 bisa stop dengan bersih
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT',  () => child.kill('SIGINT'));
