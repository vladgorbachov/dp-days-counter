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
  /** True when the user explicitly clicked "Check for Updates". */
  userInitiated?: boolean;
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

/** Business rule mirrored in the renderer hours modal. */
export const MIN_DP_HOURS_FOR_DAY = 2;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateKey(key: string): boolean {
  return DATE_KEY_RE.test(key);
}

function isValidHoursValue(raw: unknown): raw is number {
  return typeof raw === 'number'
    && Number.isInteger(raw)
    && raw >= 0
    && raw <= MAX_DP_HOURS_PER_DAY;
}

/**
 * Validate that a value looks like persisted DP days data.
 * Keys must be ISO-like YYYY-MM-DD, values integers in [0, 24].
 */
export function isValidDpDays(value: unknown): value is DPDays {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isValidDateKey(key) || !isValidHoursValue(raw)) return false;
  }
  return true;
}

/**
 * Drop invalid keys instead of discarding the entire file.
 * Preserves legacy entries (including 1-hour days) so upgrades never wipe data.
 */
export function sanitizeDpDays(value: unknown): DPDays {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: DPDays = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isValidDateKey(key) || !isValidHoursValue(raw) || raw === 0) continue;
    result[key] = raw;
  }
  return result;
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

/** Returns true when an automatic startup update check is due (default: weekly). */
export function shouldAutoCheckForUpdates(settings: AppSettings, intervalDays = 7): boolean {
  if (settings.autoUpdateCheck === false) return false;
  if (!settings.lastUpdateCheck) return true;
  const last = new Date(settings.lastUpdateCheck);
  if (Number.isNaN(last.getTime())) return true;
  const elapsedDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= intervalDays;
}
