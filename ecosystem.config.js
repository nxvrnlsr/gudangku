// PM2 Ecosystem Config — GudangKu
// Jalankan: pm2 start ecosystem.config.js
// Stop:     pm2 stop all
// Status:   pm2 status
// Logs:     pm2 logs

module.exports = {
  apps: [
    // ─── Backend API (Express) ───────────────────────────
    {
      name: 'gudangku-backend',
      script: 'src/index.js', 
      cwd: './backend',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development',
      },
      // Auto-restart jika crash
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // Jangan watch — nodemon di backend sudah handle ini
      watch: false,
      // Log output
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ─── Frontend (Next.js dev) ──────────────────────────
    // PM2 membutuhkan entrypoint Node.js — gunakan wrapper script
    {
      name: 'gudangku-frontend',
      script: './scripts/frontend-runner.js',
      cwd: './',                   // root project
      env: {
        NODE_ENV: 'development',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
