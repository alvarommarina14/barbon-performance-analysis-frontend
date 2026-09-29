import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface PickedVideo {
  path: string;
  name: string;
  size: number;
}

export interface PickedFile {
  path: string;
  name: string;
  size: number;
}

const barbonAnalysis = {
  pickVideoFile: (): Promise<PickedVideo | null> => ipcRenderer.invoke('dialog:pickVideoFile'),

  pickPdfFile: (): Promise<PickedFile | null> => ipcRenderer.invoke('dialog:pickPdfFile'),

  uploadFeedback: (
    args: { filePath: string; uploadUrl: string },
    onProgress: (fraction: number) => void,
  ): Promise<void> => {
    const listener = (_event: IpcRendererEvent, fraction: number) => onProgress(fraction);
    ipcRenderer.on('feedback:progress', listener);
    return ipcRenderer
      .invoke('feedback:upload', args)
      .finally(() => ipcRenderer.removeListener('feedback:progress', listener));
  },

  // Small, infrequently replaced files (a PDF guide) — a plain PUT, not the tus-based upload
  // above, which exists for resumable multi-hundred-megabyte video exports.
  uploadContent: (
    args: { filePath: string; uploadUrl: string; contentType: string },
    onProgress: (fraction: number) => void,
  ): Promise<void> => {
    const listener = (_event: IpcRendererEvent, fraction: number) => onProgress(fraction);
    ipcRenderer.on('content:progress', listener);
    return ipcRenderer
      .invoke('content:upload', args)
      .finally(() => ipcRenderer.removeListener('content:progress', listener));
  },

  session: {
    read: (): Promise<string | null> => ipcRenderer.invoke('session:read'),
    write: (payload: string): Promise<void> => ipcRenderer.invoke('session:write', payload),
    clear: (): Promise<void> => ipcRenderer.invoke('session:clear'),
  },

  windowControls: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
      ipcRenderer.on('window:maximize-changed', listener);
      return () => ipcRenderer.removeListener('window:maximize-changed', listener);
    },
  },
} as const;

contextBridge.exposeInMainWorld('barbonAnalysis', barbonAnalysis);

export type BarbonAnalysisBridge = typeof barbonAnalysis;
