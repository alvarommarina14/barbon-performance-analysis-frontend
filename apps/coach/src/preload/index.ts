import { contextBridge, ipcRenderer } from 'electron';

const courtProof = {
  pickVideoFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickVideoFile'),

  session: {
    read: (): Promise<string | null> => ipcRenderer.invoke('session:read'),
    write: (payload: string): Promise<void> => ipcRenderer.invoke('session:write', payload),
    clear: (): Promise<void> => ipcRenderer.invoke('session:clear'),
  },
} as const;

contextBridge.exposeInMainWorld('courtProof', courtProof);

export type CourtProofBridge = typeof courtProof;
