import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface PickedVideo {
  path: string;
  name: string;
  size: number;
}

const barbonAnalysis = {
  pickVideoFile: (): Promise<PickedVideo | null> => ipcRenderer.invoke('dialog:pickVideoFile'),

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

  session: {
    read: (): Promise<string | null> => ipcRenderer.invoke('session:read'),
    write: (payload: string): Promise<void> => ipcRenderer.invoke('session:write', payload),
    clear: (): Promise<void> => ipcRenderer.invoke('session:clear'),
  },
} as const;

contextBridge.exposeInMainWorld('barbonAnalysis', barbonAnalysis);

export type BarbonAnalysisBridge = typeof barbonAnalysis;
