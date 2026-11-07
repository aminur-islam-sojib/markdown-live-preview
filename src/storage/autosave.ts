/**
 * Debounce helper function with cancel and flush controls.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number
): ((...args: Args) => void) & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const debounced = (...args: Args) => {
    lastArgs = args;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (lastArgs !== null) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      if (lastArgs !== null) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }
  };

  return debounced;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): boolean;
  isAvailable(): boolean;
}

/**
 * In-memory fallback storage when localStorage is disabled or throws QuotaExceededError.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): boolean {
    this.store.set(key, value);
    return true;
  }

  removeItem(key: string): boolean {
    return this.store.delete(key);
  }

  isAvailable(): boolean {
    return true;
  }
}

/**
 * Safe wrapper over window.localStorage that never throws exceptions
 * and gracefully falls back to memory storage.
 */
export class SafeLocalStorage implements StorageAdapter {
  private fallback = new MemoryStorageAdapter();
  private storageAvailable: boolean;

  constructor() {
    this.storageAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.storageAvailable;
  }

  getItem(key: string): string | null {
    if (!this.storageAvailable) {
      return this.fallback.getItem(key);
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return this.fallback.getItem(key);
    }
  }

  setItem(key: string, value: string): boolean {
    if (!this.storageAvailable) {
      return this.fallback.setItem(key, value);
    }
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      // Handles QuotaExceededError or security policy changes at runtime
      return this.fallback.setItem(key, value);
    }
  }

  removeItem(key: string): boolean {
    if (!this.storageAvailable) {
      return this.fallback.removeItem(key);
    }
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return this.fallback.removeItem(key);
    }
  }
}

export const STORAGE_KEYS = {
  CONTENT: 'com.markdownlivepreview.last_content',
  LEGACY_NAMESPACE: 'com.markdownlivepreview',
  LEGACY_KEY: 'last_state'
} as const;

export type SaveStatus = 'saved' | 'saving' | 'error' | 'unavailable';

export interface AutosaveOptions {
  storage?: StorageAdapter;
  debounceMs?: number;
  onStatusChange?: (status: SaveStatus) => void;
}

/**
 * Autosave manager providing debounced saves, immediate flush,
 * error handling, and legacy key migration.
 */
export class AutosaveManager {
  private storage: StorageAdapter;
  private debouncedSave: ((content: string) => void) & { cancel: () => void; flush: () => void };
  private onStatusChange?: (status: SaveStatus) => void;
  private lastSavedContent: string | null = null;

  constructor(options: AutosaveOptions = {}) {
    this.storage = options.storage ?? new SafeLocalStorage();
    this.onStatusChange = options.onStatusChange;
    const debounceMs = options.debounceMs ?? 300;

    this.debouncedSave = debounce((content: string) => {
      this.executeSave(content);
    }, debounceMs);

    // Ensure pending changes are saved when user leaves or closes window
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.debouncedSave.flush();
      });
    }
  }

  private executeSave(content: string): boolean {
    if (content === this.lastSavedContent) {
      this.onStatusChange?.('saved');
      return true;
    }

    this.onStatusChange?.('saving');
    const success = this.storage.setItem(STORAGE_KEYS.CONTENT, content);
    if (success) {
      this.lastSavedContent = content;
      this.onStatusChange?.(this.storage.isAvailable() ? 'saved' : 'unavailable');
      return true;
    } else {
      this.onStatusChange?.('error');
      return false;
    }
  }

  /**
   * Schedules a debounced save of the markdown content.
   */
  save(content: string): void {
    this.onStatusChange?.('saving');
    this.debouncedSave(content);
  }

  /**
   * Saves content immediately without waiting for debounce.
   */
  saveImmediately(content: string): boolean {
    this.debouncedSave.cancel();
    return this.executeSave(content);
  }

  /**
   * Loads saved content. If new key exists, returns it.
   * If not found, checks for legacy storehouse data and migrates it.
   */
  load(fallbackContent: string): string {
    try {
      const saved = this.storage.getItem(STORAGE_KEYS.CONTENT);
      if (typeof saved === 'string') {
        this.lastSavedContent = saved;
        return saved;
      }

      // Check legacy storage if available in window.localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            const raw = window.localStorage.getItem(key);
            if (raw && raw.includes(STORAGE_KEYS.LEGACY_NAMESPACE) && raw.includes(STORAGE_KEYS.LEGACY_KEY)) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.value === 'string') {
                  this.saveImmediately(parsed.value);
                  return parsed.value;
                }
              } catch {
                // Ignore parse errors from unverified keys
              }
            }
          }
        }
      }
    } catch {
      // In case localStorage access throws
    }

    this.lastSavedContent = fallbackContent;
    return fallbackContent;
  }

  isStorageAvailable(): boolean {
    return this.storage.isAvailable();
  }
}
