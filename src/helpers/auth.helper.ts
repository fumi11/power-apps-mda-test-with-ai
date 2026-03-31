import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), '.auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Auth helper — manages Playwright storageState for MDA session persistence.
 */
export const AuthHelper = {
  /**
   * Get the path to the storageState file.
   */
  getStorageStatePath(): string {
    return STORAGE_STATE_PATH;
  },

  /**
   * Ensure the .auth directory exists.
   */
  ensureAuthDir(): void {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  },

  /**
   * Check whether a valid (non-expired) storageState file exists.
   */
  isStorageStateValid(): boolean {
    if (!fs.existsSync(STORAGE_STATE_PATH)) return false;
    const stat = fs.statSync(STORAGE_STATE_PATH);
    const age = Date.now() - stat.mtimeMs;
    return age < MAX_AGE_MS;
  },

  /**
   * Delete the storageState file to force re-authentication.
   */
  clearStorageState(): void {
    if (fs.existsSync(STORAGE_STATE_PATH)) {
      fs.unlinkSync(STORAGE_STATE_PATH);
    }
  },
};
