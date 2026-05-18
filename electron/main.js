/**
 * GudangKu - Electron Main Process
 * Features: auto-reconnect, health monitoring, robust error handling, auto-update.
 */

const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");

// Must be called before app is ready
app.commandLine.appendSwitch("no-sandbox");

const { spawn } = require("child_process");
const path  = require("path");
const http  = require("http");
const fs    = require("fs");
const os    = require("os");

// ─── Debug log ─────────────────────────────────────────
const LOG_FILE = path.join(os.homedir(), "Desktop", "GudangKu-debug.log");
function writeLog(msg) {
  const line = "[" + new Date().toISOString() + "] " + msg + "\n";
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
}
process.on("uncaughtException",  (err)    => writeLog("UNCAUGHT: " + err.message + "\n" + err.stack));
process.on("unhandledRejection", (reason) => writeLog("REJECTION: " + String(reason)));

// ─── Config ────────────────────────────────────────────
const FRONTEND_PORT = 3000;
const BACKEND_PORT  = 3001;
const FRONTEND_URL  = "http://localhost:" + FRONTEND_PORT;
const IS_DEV        = !app.isPackaged;
const IS_WIN        = process.platform === "win32";
const HEALTH_INTERVAL_MS = 12000; // check every 12s

writeLog("App starting. isPackaged=" + app.isPackaged + " IS_DEV=" + IS_DEV);

let mainWindow       = null;
let healthTimer      = null;
let isReconnecting   = false;
const childProcesses = [];
const spawnedPorts   = new Set(); // ports we are responsible for

// ─── IPC ───────────────────────────────────────────────
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("install-update",  () => {
  writeLog("[Updater] User meminta install sekarang.");
  const { autoUpdater } = require("electron-updater");
  autoUpdater.quitAndInstall(false, true); // isSilent=false, isForceRunAfter=true
});

// ─── Port check ────────────────────────────────────────
function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:" + port, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => { req.destroy(); resolve(false); });
  });
}

// ─── Wait for port ─────────────────────────────────────
function waitForPort(port, maxMs) {
  if (!maxMs) maxMs = 60000;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      isPortOpen(port).then((open) => {
        if (open) return resolve();
        if (Date.now() - start > maxMs) return reject(new Error("Port " + port + " timed out after " + maxMs + "ms"));
        setTimeout(check, 600);
      });
    };
    check();
  });
}

// ─── Spawn process ─────────────────────────────────────
function spawnProcess(name, cmd, args, cwd, env) {
  if (!env) env = {};
  writeLog("[Spawn] " + name + ": " + cmd + " " + args.join(" ") + " cwd=" + cwd);
  const child = spawn(cmd, args, {
    cwd,
    env: Object.assign({}, process.env, env),
    shell: IS_WIN,
    windowsHide: true,
    stdio: "pipe",
  });
  child.stdout.on("data", (d) => writeLog("[" + name + "] " + d.toString().trim()));
  child.stderr.on("data", (d) => writeLog("[" + name + "][ERR] " + d.toString().trim()));
  child.on("error",  (err)  => writeLog("[" + name + "] SpawnError: " + err.message));
  child.on("exit",   (code) => writeLog("[" + name + "] Exit code=" + code));
  childProcesses.push(child);
  return child;
}

// ─── Kill all ──────────────────────────────────────────
function killAllProcesses() {
  writeLog("[Main] Killing child processes...");
  childProcesses.forEach((child) => {
    try {
      if (IS_WIN) spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true, windowsHide: true });
      else child.kill("SIGTERM");
    } catch (e) {}
  });
}

// ─── Interactive Splash HTML ───────────────────────────
function buildOverlayHTML(title, subtitle, showBar) {
  const tips = [
    "💡 Tip: Gunakan shortcut keyboard untuk navigasi lebih cepat.",
    "📦 Stok barang diperbarui secara real-time di semua perangkat.",
    "🔒 Data Anda dienkripsi dan aman di server lokal.",
    "📊 Laporan stok tersedia kapan saja di menu Laporan.",
    "🚀 Semua perubahan tersimpan otomatis tanpa perlu klik Simpan.",
  ];

  // Build the full HTML as a single encoded string
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GudangKu</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0a0c12;
    color: #fff;
    font-family: Inter, system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    overflow: hidden;
    cursor: none;
    user-select: none;
  }

  /* ── Canvas for particles ── */
  #bg { position: fixed; inset: 0; z-index: 0; }

  /* ── Cursor glow orb ── */
  #glow {
    position: fixed;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(79,142,247,0.18) 0%, rgba(167,139,250,0.08) 50%, transparent 70%);
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: left 0.08s ease-out, top 0.08s ease-out;
    z-index: 1;
    filter: blur(2px);
  }

  /* ── Custom cursor dot ── */
  #cursor {
    position: fixed;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #4f8ef7;
    pointer-events: none;
    transform: translate(-50%, -50%);
    z-index: 100;
    box-shadow: 0 0 12px #4f8ef7, 0 0 24px rgba(79,142,247,0.5);
    transition: left 0.04s ease-out, top 0.04s ease-out, transform 0.15s ease, background 0.2s;
  }
  #cursor.clicking {
    transform: translate(-50%, -50%) scale(2.5);
    background: #a78bfa;
    box-shadow: 0 0 20px #a78bfa, 0 0 40px rgba(167,139,250,0.6);
  }

  /* ── Ripple ── */
  .ripple {
    position: fixed;
    border-radius: 50%;
    border: 1.5px solid rgba(79,142,247,0.6);
    pointer-events: none;
    animation: ripple-out 0.7s ease-out forwards;
    z-index: 50;
  }
  @keyframes ripple-out {
    0%   { width: 0;     height: 0;     opacity: 0.9; transform: translate(-50%,-50%); }
    100% { width: 160px; height: 160px; opacity: 0;   transform: translate(-50%,-50%); }
  }

  /* ── Card ── */
  .card {
    position: relative;
    z-index: 10;
    text-align: center;
    max-width: 400px;
    padding: 44px 40px 36px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
    animation: card-in 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes card-in {
    from { opacity: 0; transform: translateY(24px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }

  .logo {
    font-size: 38px;
    font-weight: 700;
    letter-spacing: -1.5px;
    background: linear-gradient(135deg, #4f8ef7 30%, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 3s ease-in-out infinite;
  }
  @keyframes shimmer {
    0%, 100% { filter: brightness(1); }
    50%       { filter: brightness(1.3) drop-shadow(0 0 12px rgba(167,139,250,0.5)); }
  }

  .tagline {
    font-size: 11px;
    color: #3d4460;
    margin: 6px 0 36px;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 400;
  }

  /* ── Ring spinner ── */
  .ring-wrap {
    position: relative;
    width: 56px;
    height: 56px;
    margin: 0 auto 28px;
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid transparent;
  }
  .ring-outer {
    border-top-color: #4f8ef7;
    border-right-color: rgba(79,142,247,0.2);
    animation: spin 1.1s linear infinite;
  }
  .ring-inner {
    inset: 8px;
    border-bottom-color: #a78bfa;
    border-left-color: rgba(167,139,250,0.2);
    animation: spin 0.7s linear infinite reverse;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Bar ── */
  .bar-wrap {
    width: 200px;
    height: 3px;
    background: #1a1d2e;
    border-radius: 4px;
    margin: 0 auto 24px;
    overflow: hidden;
  }
  .bar {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #4f8ef7, #a78bfa, #4f8ef7);
    background-size: 200% 100%;
    animation: bar-flow 2s ease-in-out infinite;
  }
  @keyframes bar-flow {
    0%   { width: 10%; background-position: 0% 0%; }
    50%  { width: 80%; background-position: 100% 0%; }
    100% { width: 10%; background-position: 0% 0%; }
  }

  h2 { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #e2e8f0; }
  .sub { color: #44495e; font-size: 13px; line-height: 1.6; margin-bottom: 28px; }

  /* ── Tips ticker ── */
  .tips-box {
    background: rgba(79,142,247,0.06);
    border: 1px solid rgba(79,142,247,0.12);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    color: #5a6480;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.4s;
  }
  .tips-box.fade { opacity: 0; }

  /* ── Status dots ── */
  .dots { display: flex; justify-content: center; gap: 6px; margin-top: 20px; }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #1e2230;
    animation: dot-bounce 1.4s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: scale(1);   background: #1e2230; }
    40%           { transform: scale(1.4); background: #4f8ef7; }
  }
</style>
</head>
<body>
<canvas id="bg"></canvas>
<div id="glow"></div>
<div id="cursor"></div>

<div class="card">
  <div class="logo">GudangKu</div>
  <div class="tagline">Warehouse Management System</div>

  <div class="ring-wrap">
    <div class="ring ring-outer"></div>
    <div class="ring ring-inner"></div>
  </div>

  ${showBar ? '<div class="bar-wrap"><div class="bar"></div></div>' : ''}

  <h2 id="title-el">${title}</h2>
  <p class="sub" id="sub-el">${subtitle}</p>

  <div class="tips-box" id="tip">Memuat modul sistem...</div>
  <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
</div>

<script>
(function() {
  // ── Cursor & glow ──────────────────────────────────
  const glow   = document.getElementById('glow');
  const cursor = document.getElementById('cursor');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;

  document.addEventListener('mousemove', function(e) {
    mx = e.clientX; my = e.clientY;
    glow.style.left   = mx + 'px';
    glow.style.top    = my + 'px';
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  document.addEventListener('mousedown', function(e) {
    cursor.classList.add('clicking');
    createRipple(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', function() {
    cursor.classList.remove('clicking');
  });

  // ── Ripple burst on click ──────────────────────────
  function createRipple(x, y) {
    for (var i = 0; i < 3; i++) {
      (function(delay) {
        setTimeout(function() {
          var r = document.createElement('div');
          r.className = 'ripple';
          r.style.left = x + 'px';
          r.style.top  = y + 'px';
          r.style.animationDelay = delay + 'ms';
          document.body.appendChild(r);
          setTimeout(function() { r.remove(); }, 900);
        }, delay);
      })(i * 120);
    }
  }

  // ── Particle canvas ────────────────────────────────
  var canvas = document.getElementById('bg');
  var ctx    = canvas.getContext('2d');
  var W = canvas.width  = window.innerWidth;
  var H = canvas.height = window.innerHeight;

  window.addEventListener('resize', function() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  var NUM = 55;
  var particles = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  for (var i = 0; i < NUM; i++) {
    particles.push({
      x: rand(0, W), y: rand(0, H),
      r: rand(1, 2.5),
      vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25),
      alpha: rand(0.1, 0.5),
      color: Math.random() > 0.5 ? '79,142,247' : '167,139,250',
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Mouse-attracted glow on canvas
    var gr = ctx.createRadialGradient(mx, my, 0, mx, my, 280);
    gr.addColorStop(0, 'rgba(79,142,247,0.06)');
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);

    // Draw connection lines between nearby particles & cursor
    for (var i = 0; i < NUM; i++) {
      var p = particles[i];

      // Attract slightly toward cursor
      var dx = mx - p.x, dy = my - p.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 200) {
        p.vx += dx * 0.00008;
        p.vy += dy * 0.00008;
      }

      // Speed cap
      var speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if (speed > 0.8) { p.vx = p.vx/speed*0.8; p.vy = p.vy/speed*0.8; }

      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      // Connect nearby particles
      for (var j = i+1; j < NUM; j++) {
        var q = particles[j];
        var ex = p.x - q.x, ey = p.y - q.y;
        var d2 = ex*ex + ey*ey;
        if (d2 < 14000) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(' + p.color + ',' + (0.12 * (1 - d2/14000)) + ')';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // Draw particle dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(' + p.color + ',' + p.alpha + ')';
      ctx.fill();
    }

    requestAnimationFrame(drawFrame);
  }
  drawFrame();

  // ── Tips ticker ────────────────────────────────────
  var tips = ${JSON.stringify(tips)};
  var ti = 0;
  var tipEl = document.getElementById('tip');
  setInterval(function() {
    tipEl.classList.add('fade');
    setTimeout(function() {
      ti = (ti + 1) % tips.length;
      tipEl.textContent = tips[ti];
      tipEl.classList.remove('fade');
    }, 420);
  }, 3200);
})();
<\/script>
</body>
</html>`;

  // Encode as data URL (use encodeURIComponent for safety)
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}

// ─── Startup splash ────────────────────────────────────
function showStartupSplash() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadURL(
    buildOverlayHTML(
      "Memulai aplikasi...",
      "Menyiapkan server backend dan frontend.<br>Ini mungkin membutuhkan 1\u20132 menit<br>pada perangkat baru.",
      true
    )
  ).catch(() => {});
}

// ─── Reconnecting overlay ──────────────────────────────
function showReconnectingPage() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadURL(
    buildOverlayHTML(
      "Menghubungkan ulang...",
      "Server sedang direstart, harap tunggu...",
      false
    )
  ).catch(() => {});
}

// ─── Ensure backend ────────────────────────────────────
async function ensureBackend() {
  const ok = await isPortOpen(BACKEND_PORT);
  if (ok) return true;
  writeLog("[Health] Backend down - spawning...");
  const backendDir = path.join(__dirname, "..", "backend");
  spawnProcess("Backend", "node", ["src/index.js"], backendDir, {
    NODE_ENV: IS_DEV ? "development" : "production"
  });
  spawnedPorts.add(BACKEND_PORT);
  try { await waitForPort(BACKEND_PORT, 25000); writeLog("[Health] Backend online."); return true; }
  catch(e) { writeLog("[Health] Backend failed: " + e.message); return false; }
}

// ─── Ensure frontend ───────────────────────────────────
async function ensureFrontend() {
  const ok = await isPortOpen(FRONTEND_PORT);
  if (ok) return true;
  writeLog("[Health] Frontend down - spawning...");
  const frontendDir = path.join(__dirname, "..", "frontend");
  if (IS_DEV) {
    spawnProcess("Frontend", "npm", ["run", "dev"], frontendDir, { NODE_ENV: "development" });
  } else {
    const standaloneDir = path.join(frontendDir, ".next", "standalone");
    spawnProcess("Frontend", "node", ["server.js"], standaloneDir, {
      NODE_ENV: "production",
      PORT: String(FRONTEND_PORT),
      HOSTNAME: "127.0.0.1",
    });
  }
  spawnedPorts.add(FRONTEND_PORT);
  try { await waitForPort(FRONTEND_PORT, 60000); writeLog("[Health] Frontend online."); return true; }
  catch(e) { writeLog("[Health] Frontend failed: " + e.message); return false; }
}

// ─── Health monitor ────────────────────────────────────
function startHealthMonitor() {
  if (healthTimer) clearInterval(healthTimer);
  healthTimer = setInterval(async () => {
    if (isReconnecting) return; // skip if already reconnecting
    const [backendOk, frontendOk] = await Promise.all([
      isPortOpen(BACKEND_PORT),
      isPortOpen(FRONTEND_PORT),
    ]);
    if (backendOk && frontendOk) return; // all good

    writeLog("[Health] Service down! Backend=" + backendOk + " Frontend=" + frontendOk);
    isReconnecting = true;
    showReconnectingPage();

    const bOk = backendOk  ? true : await ensureBackend();
    const fOk = frontendOk ? true : await ensureFrontend();

    if (fOk) {
      writeLog("[Health] Services restored. Reloading window in 1.5s...");
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          let attempts = 0;
          const reload = () => {
            attempts++;
            mainWindow.loadURL(FRONTEND_URL).catch(() => {
              if (attempts < 8) setTimeout(reload, 2000);
            });
          };
          reload();
        }
        isReconnecting = false;
      }, 1500);
    } else {
      isReconnecting = false;
      writeLog("[Health] Could not restore services.");
    }
  }, HEALTH_INTERVAL_MS);
  writeLog("[Health] Monitor started (interval=" + HEALTH_INTERVAL_MS + "ms)");
}

// ─── Create window ─────────────────────────────────────
function createWindow() {
  writeLog("[Main] Creating BrowserWindow...");
  mainWindow = new BrowserWindow({
    show: false,
    title: "GudangKu",
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.maximize();
  mainWindow.show();

  // Renderer crash - reload
  mainWindow.webContents.on("render-process-gone", (e, details) => {
    writeLog("[Renderer] CRASHED: " + details.reason + " exitCode=" + details.exitCode);
    setTimeout(async () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const fOk = await isPortOpen(FRONTEND_PORT);
      if (fOk) {
        mainWindow.loadURL(FRONTEND_URL).catch(() => {});
      } else {
        isReconnecting = true;
        showReconnectingPage();
        await ensureFrontend();
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(FRONTEND_URL).catch(() => {});
          isReconnecting = false;
        }, 1500);
      }
    }, 2000);
  });

  // Console errors from renderer
  mainWindow.webContents.on("console-message", (e, level, message) => {
    if (level >= 2) writeLog("[Renderer][console] L" + level + ": " + message);
  });

  // Load with retry
  let loadAttempts = 0;
  const loadFrontend = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    loadAttempts++;
    writeLog("[Window] Load attempt " + loadAttempts + " -> " + FRONTEND_URL);
    mainWindow.loadURL(FRONTEND_URL).catch((err) => writeLog("[Window] loadURL err: " + err.message));
  };
  mainWindow.webContents.on("did-fail-load", (e, code, desc) => {
    if (isReconnecting) return; // already handling it
    writeLog("[Window] did-fail-load: " + code + " " + desc);
    if (loadAttempts < 20) setTimeout(loadFrontend, 2000);
    else dialog.showErrorBox("GudangKu Error", "Cannot connect.\nLog: " + LOG_FILE);
  });
  mainWindow.webContents.on("did-finish-load", () => {
    writeLog("[Window] Loaded OK (attempt=" + loadAttempts + ")");
    loadAttempts = 0; // reset counter on success
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("http://localhost")) { shell.openExternal(url); return { action: "deny" }; }
    return { action: "allow" };
  });

  if (IS_DEV) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => { writeLog("[Main] Window closed."); mainWindow = null; });

  loadFrontend();
}

// ─── Menu ──────────────────────────────────────────────
function setupMenu() {
  if (!IS_DEV) Menu.setApplicationMenu(null);
}

// ─── Auto Updater ──────────────────────────────────────
function setupAutoUpdater() {
  if (IS_DEV) {
    writeLog("[Updater] Mode dev — auto-update dinonaktifkan.");
    return;
  }

  let autoUpdater;
  try {
    autoUpdater = require("electron-updater").autoUpdater;
  } catch (e) {
    writeLog("[Updater] electron-updater tidak tersedia: " + e.message);
    return;
  }

  // ── Baca provider dari updater.config.js ──
  // Untuk ganti dari GitHub ke custom server, cukup ubah updater.config.js
  // tanpa perlu menyentuh file ini.
  try {
    const updaterCfg = require(path.join(__dirname, "updater.config.js"));
    autoUpdater.setFeedURL(updaterCfg);
    writeLog("[Updater] Provider: " + updaterCfg.provider +
      (updaterCfg.url ? " url=" + updaterCfg.url : 
       " owner=" + updaterCfg.owner + "/" + updaterCfg.repo));
  } catch (e) {
    writeLog("[Updater] Gagal baca updater.config.js: " + e.message + " — pakai default package.json");
  }

  // ── Opsi perilaku update ──
  autoUpdater.autoDownload        = true;  // download otomatis di background
  autoUpdater.autoInstallOnAppQuit = true; // install saat app ditutup
  autoUpdater.allowDowngrade      = false;
  autoUpdater.allowPrerelease     = false;

  // Abaikan error code signing di Windows (tanpa certificate)
  // Hapus baris ini jika sudah pakai code signing certificate
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  // ── Event handlers ──
  autoUpdater.on("checking-for-update", () => {
    writeLog("[Updater] Memeriksa update...");
    sendUpdaterEvent("update-status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    writeLog("[Updater] Update tersedia: v" + info.version + " (saat ini v" + app.getVersion() + ")");
    sendUpdaterEvent("update-status", { status: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    writeLog("[Updater] Aplikasi sudah versi terbaru (v" + app.getVersion() + ")");
    sendUpdaterEvent("update-status", { status: "up-to-date" });
  });

  autoUpdater.on("download-progress", (progress) => {
    const pct = Math.round(progress.percent);
    writeLog("[Updater] Mengunduh update... " + pct + "%");
    sendUpdaterEvent("update-status", {
      status:   "downloading",
      percent:  pct,
      bytesPs:  Math.round(progress.bytesPerSecond / 1024), // KB/s
      total:    Math.round(progress.total / 1024 / 1024),   // MB
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    writeLog("[Updater] Update v" + info.version + " siap diinstall.");
    sendUpdaterEvent("update-status", { status: "ready", version: info.version });
    // Mode A — otomatis: install saat app ditutup (autoInstallOnAppQuit sudah true)
    // Renderer akan tampilkan notif non-intrusive untuk restart sekarang.
  });

  autoUpdater.on("error", (err) => {
    // Jangan crash karena update gagal — log saja
    const msg = err ? err.message : "unknown error";
    writeLog("[Updater] Error: " + msg);
    // Abaikan error jaringan / no internet agar tidak mengganggu user
    if (!msg.includes("net::") && !msg.includes("ENOTFOUND") && !msg.includes("ETIMEDOUT")) {
      sendUpdaterEvent("update-status", { status: "error", message: msg });
    }
  });

  // ── Jadwal pengecekan ──
  // Cek pertama kali 10 detik setelah app siap (beri waktu load)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err =>
      writeLog("[Updater] Check gagal: " + (err ? err.message : err))
    );
  }, 10000);

  // Cek ulang setiap 4 jam
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err =>
      writeLog("[Updater] Periodic check gagal: " + (err ? err.message : err))
    );
  }, 4 * 60 * 60 * 1000);

  writeLog("[Updater] Auto-updater aktif.");
}

// Helper: kirim event ke renderer (safe — tidak crash jika window belum ada)
function sendUpdaterEvent(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send(channel, data); } catch (e) {}
  }
}

// ─── Lifecycle ─────────────────────────────────────────
app.whenReady().then(async () => {
  setupMenu();
  // Show window immediately with splash so user sees feedback
  createWindow();
  showStartupSplash();

  try {
    const [backendRunning, frontendRunning] = await Promise.all([
      isPortOpen(BACKEND_PORT),
      isPortOpen(FRONTEND_PORT),
    ]);
    writeLog("[Main] Backend=" + backendRunning + " Frontend=" + frontendRunning);

    if (!backendRunning) {
      await ensureBackend();
    }
    if (!frontendRunning) {
      await ensureFrontend();
    }

    // Services ready - load the real app
    writeLog("[Main] All services ready. Loading frontend...");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(FRONTEND_URL).catch((err) =>
        writeLog("[Main] Final loadURL error: " + err.message)
      );
    }
    startHealthMonitor();
    setupAutoUpdater(); // mulai cek update setelah app siap
  } catch (err) {
    writeLog("[Main] Startup error: " + err.message);
    // Still try to load - retry logic in did-fail-load will handle it
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(FRONTEND_URL).catch(() => {});
    }
    startHealthMonitor();
    setupAutoUpdater();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  writeLog("[Main] All windows closed. Quitting.");
  if (healthTimer) clearInterval(healthTimer);
  killAllProcesses();
  app.quit();
});

app.on("before-quit", () => {
  if (healthTimer) clearInterval(healthTimer);
  killAllProcesses();
});
