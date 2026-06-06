/**
 * Shared type definitions used by main and preload processes.
 * The renderer keeps a parallel copy in `src/renderer/electron-api.d.ts` to
 * stay decoupled from main process imports while remaining type-checked.
 */

export type Theme = 'light' | 'dark';

export interface AppSettings {
  theme: Theme;
  lastUpdateCheck?: string;
  autoUpdateCheck?: boolean;
}

export type DPDays = Record<string, number>;

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
  progressPercent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  errorMessage?: string;
}

export const UPDATE_EVENT_CHANNEL = 'updater:state';
export const UPDATE_CHECK_CHANNEL = 'updater:check';
export const UPDATE_DOWNLOAD_CHANNEL = 'updater:download';
export const UPDATE_INSTALL_CHANNEL = 'updater:install';
export const UPDATE_GET_STATE_CHANNEL = 'updater:get-state';

export const WINDOW_STATE_CHANNEL = 'window:state';

export interface WindowState {
  isMaximized: boolean;
}

/** Hard cap for daily DP hours (sanity check on IPC payloads). */
export const MAX_DP_HOURS_PER_DAY = 24;

/**
 * Validate that a value looks like persisted DP days data.
 * Keys must be ISO-like YYYY-MM-DD, values integers in [0, 24].
 */
export function isValidDpDays(value: unknown): value is DPDays {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const dateKeyRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!dateKeyRe.test(key)) return false;
    if (typeof raw !== 'number' || !Number.isInteger(raw)) return false;
    if (raw < 0 || raw > MAX_DP_HOURS_PER_DAY) return false;
  }
  return true;
}

/** Validate a settings payload. Unknown keys are dropped by callers. */
export function isValidSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AppSettings>;
  if (v.theme !== 'light' && v.theme !== 'dark') return false;
  if (v.lastUpdateCheck !== undefined && typeof v.lastUpdateCheck !== 'string') return false;
  if (v.autoUpdateCheck !== undefined && typeof v.autoUpdateCheck !== 'boolean') return false;
  return true;
}
