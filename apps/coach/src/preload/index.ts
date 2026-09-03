import { contextBridge, ipcRenderer } from 'electron';

const barbonAnalysis = {
  pickVideoFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickVideoFile'),

  session: {
    read: (): Promise<string | null> => ipcRenderer.invoke('session:read'),
    write: (payload: string): Promise<void> => ipcRenderer.invoke('session:write', payload),
    clear: (): Promise<void> => ipcRenderer.invoke('session:clear'),
  },
} as const;

contextBridge.exposeInMainWorld('barbonAnalysis', barbonAnalysis);

export type BarbonAnalysisBridge = typeof barbonAnalysis;
