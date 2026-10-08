import { createReadStream, statSync } from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import { basename, join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as tus from 'tus-js-client';
import icon from '../../resources/icon.png?asset';
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
    icon,
    autoHideMenuBar: true,
    // No native title bar: the renderer draws its own to match the app's dark theme.
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  window.on('ready-to-show', () => window.show());
  window.on('maximize', () => window.webContents.send('window:maximize-changed', true));
  window.on('unmaximize', () => window.webContents.send('window:maximize-changed', false));

  // The renderer cancels a close or reload while something is unsaved; Electron does that silently,
  // so ask here. preventDefault() on this event means "unload anyway".
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      buttons: ['Discard changes', 'Keep editing'],
      defaultId: 1,
      cancelId: 1,
      title: 'Discard unsaved changes?',
      message: 'You have changes that are not saved yet. If you leave now, they are lost.',
    });
    if (choice === 0) {
      event.preventDefault();
    }
  });

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
        // Keep the progress bar moving on smaller exports without flooding the server on large ones.
        chunkSize: 8 * 1024 * 1024,
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

ipcMain.handle('dialog:pickPdfFile', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select the recording guide PDF',
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  const filePath = result.canceled ? undefined : result.filePaths[0];
  if (!filePath) {
    return null;
  }
  return { path: filePath, name: basename(filePath), size: statSync(filePath).size };
});

// A plain PUT straight from disk — small, infrequently replaced files have no need for tus'
// resumability.
ipcMain.handle(
  'content:upload',
  (
    event,
    { filePath, uploadUrl, contentType }: { filePath: string; uploadUrl: string; contentType: string },
  ) =>
    new Promise<void>((resolve, reject) => {
      const size = statSync(filePath).size;
      const url = new URL(uploadUrl);
      const client = url.protocol === 'https:' ? https : http;
      const request = client.request(url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, 'Content-Length': size },
      });
      request.on('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
      request.on('response', (response) => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`Upload failed with status ${response.statusCode}`));
          return;
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send('content:progress', 1);
        }
        resolve();
      });

      // Reading the file runs ahead of the network, so the last chunk leaves the disk well before
      // the storage has taken it. Hold at 99% until the PUT is answered; 100% means "stored".
      let sent = 0;
      const stream = createReadStream(filePath);
      stream.on('data', (chunk: Buffer) => {
        sent += chunk.length;
        if (!event.sender.isDestroyed()) {
          event.sender.send('content:progress', size > 0 ? Math.min(sent / size, 0.99) : 0);
        }
      });
      stream.pipe(request);
    }),
);

// Session storage stays in the main process: the renderer never touches the encrypted file.
ipcMain.handle('session:read', () => tokenVault.read());
ipcMain.handle('session:write', (_event, payload: string) => tokenVault.write(payload));
ipcMain.handle('session:clear', () => tokenVault.clear());

ipcMain.handle('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.handle('window:toggleMaximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return;
  }
  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});
ipcMain.handle('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());
ipcMain.handle(
  'window:isMaximized',
  (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false,
);

app.whenReady().then(() => {
  // The default menu is invisible (autoHideMenuBar) but still owns Ctrl+R, which would reload the
  // window and drop unsaved work, and Ctrl+Shift+I. An installed build gets no menu at all.
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }
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
