import { createReadStream, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as tus from 'tus-js-client';
import { tokenVault } from './tokenVault';

const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    // Matches the mockup's background so the window does not flash white while loading.
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.on('ready-to-show', () => window.show());

  // External links open in the user's browser, never inside the app window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

ipcMain.handle('dialog:pickVideoFile', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select the edited feedback video',
    properties: ['openFile'],
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'm4v'] }],
  });

  const filePath = result.canceled ? undefined : result.filePaths[0];
  if (!filePath) {
    return null;
  }
  return { path: filePath, name: basename(filePath), size: statSync(filePath).size };
});

// The feedback video is uploaded from here, not the renderer: it streams straight off disk so a
// multi-hundred-megabyte export never has to sit in the window's memory. `uploadUrl` is
// Cloudflare's one-time tus URL — no endpoint, no credential.
ipcMain.handle(
  'feedback:upload',
  (event, { filePath, uploadUrl }: { filePath: string; uploadUrl: string }) =>
    new Promise<void>((resolve, reject) => {
      const size = statSync(filePath).size;
      const upload = new tus.Upload(createReadStream(filePath), {
        uploadUrl,
        uploadSize: size,
        chunkSize: 50 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: { filetype: 'video/mp4' },
        onError: (error) => reject(error instanceof Error ? error : new Error(String(error))),
        onProgress: (sent, total) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('feedback:progress', total > 0 ? sent / total : 0);
          }
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    }),
);

// Session storage stays in the main process: the renderer never touches the encrypted file.
ipcMain.handle('session:read', () => tokenVault.read());
ipcMain.handle('session:write', (_event, payload: string) => tokenVault.write(payload));
ipcMain.handle('session:clear', () => tokenVault.clear());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
