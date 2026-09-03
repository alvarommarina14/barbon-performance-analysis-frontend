import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';

const FILE = () => join(app.getPath('userData'), 'session.bin');

export const tokenVault = {
  async read(): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }
    try {
      const encrypted = await readFile(FILE());
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  },

  async write(payload: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      return;
    }
    await writeFile(FILE(), safeStorage.encryptString(payload));
  },

  async clear(): Promise<void> {
    try {
      await unlink(FILE());
    } catch {
      // Already gone.
    }
  },
};
