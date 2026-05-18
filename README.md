# GudangKu — Warehouse Stock Management

GudangKu is a desktop-based warehouse management software designed for nationwide FMCG (Fast-Moving Consumer Goods) distribution. Built with Next.js, Node.js, and Electron, it provides an easy-to-use interface for managing inventory, tracking stock movements, and controlling user access.

## Key Features

- **Standalone Desktop App:** A seamless Electron application combining both Frontend and Backend, eliminating the need for a separate browser.
- **Auto-Update:** The application automatically detects, downloads, and installs updates in the background.
- **Inventory Management:** Accurately track stock levels, item movements, and manage suppliers.
- **Role-Based Access Control (RBAC):** Strict permission system for different user roles (e.g., Admin, Warehouse Manager, Staff).
- **Multilingual Support:** Instantly switch between English and Indonesian (i18n).

## Installation for Users

1. Download the latest `GudangKu-Setup-x.x.x.exe` from the [GitHub Releases page](https://github.com/nxvrnlsr/gudangku/releases).
2. Run the installer and let it automatically install.
3. Open the **GudangKu** shortcut on your Desktop. *(Note: The first launch on a new device may take 1-2 minutes to prepare the local server).*
4. **Updates:** The app will notify you when a new update is downloaded. Simply click "Restart Now" on the notification to apply it automatically without reinstalling.

## Development Guide

### Running Locally
To run the application in development mode, open two separate terminals:

**Terminal 1 (Backend API):**
```bash
cd backend
npm install
npm run dev
# API server runs on http://localhost:3001
```

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm install
npm run dev
# Web UI runs on http://localhost:3000
```

### Building the Desktop Installer
To package the app into a standalone `.exe` installer, run the following from the project root:

```bash
npm install
npm run electron:build
```
The generated installer will be located in the `dist-electron/` directory.
