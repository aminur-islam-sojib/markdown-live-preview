import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  debounce,
  MemoryStorageAdapter,
  SafeLocalStorage,
  AutosaveManager,
  STORAGE_KEYS
} from '../src/storage/autosave';

describe('Debounce utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('delays execution until after wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('a');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('resets timer if invoked again within wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('first');
    vi.advanceTimersByTime(100);
    debounced('second');

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('cancels pending execution when cancel() is called', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('test');
    debounced.cancel();

    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });

  it('executes immediately when flush() is called', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('flush-me');
    expect(fn).not.toHaveBeenCalled();

    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('flush-me');
  });
});

describe('MemoryStorageAdapter', () => {
  it('stores, retrieves, and removes items', () => {
    const storage = new MemoryStorageAdapter();
    expect(storage.getItem('key')).toBeNull();

    expect(storage.setItem('key', 'value')).toBe(true);
    expect(storage.getItem('key')).toBe('value');

    expect(storage.removeItem('key')).toBe(true);
    expect(storage.getItem('key')).toBeNull();
  });
});

describe('SafeLocalStorage', () => {
  it('works with standard localStorage when available', () => {
    const storage = new SafeLocalStorage();
    expect(storage.isAvailable()).toBe(true);

    storage.setItem('test_key', 'test_value');
    expect(storage.getItem('test_key')).toBe('test_value');

    storage.removeItem('test_key');
    expect(storage.getItem('test_key')).toBeNull();
  });

  it('falls back to memory storage without crashing when localStorage throws', () => {
    const storage = new SafeLocalStorage();

    // Simulate quota exceeded or permission denied on setItem
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    // Should not throw, should return true via in-memory fallback
    expect(() => storage.setItem('fail_key', 'safe_value')).not.toThrow();
    expect(storage.getItem('fail_key')).toBe('safe_value');

    vi.restoreAllMocks();
  });
});

describe('AutosaveManager (F3 PRD Acceptance Criteria)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('debounces saving to localStorage', () => {
    const memory = new MemoryStorageAdapter();
    const statusChanges: string[] = [];
    const manager = new AutosaveManager({
      storage: memory,
      debounceMs: 250,
      onStatusChange: (status) => statusChanges.push(status)
    });

    manager.save('# Draft 1');
    expect(memory.getItem(STORAGE_KEYS.CONTENT)).toBeNull();

    manager.save('# Draft 2');
    expect(memory.getItem(STORAGE_KEYS.CONTENT)).toBeNull();

    vi.advanceTimersByTime(250);
    expect(memory.getItem(STORAGE_KEYS.CONTENT)).toBe('# Draft 2');
    expect(statusChanges).toContain('saving');
    expect(statusChanges).toContain('saved');
  });

  it('supports saveImmediately without waiting for debounce timer', () => {
    const memory = new MemoryStorageAdapter();
    const manager = new AutosaveManager({ storage: memory, debounceMs: 500 });

    manager.saveImmediately('# Immediate');
    expect(memory.getItem(STORAGE_KEYS.CONTENT)).toBe('# Immediate');
  });

  it('restores content on reload from saved storage', () => {
    const memory = new MemoryStorageAdapter();
    memory.setItem(STORAGE_KEYS.CONTENT, '# Persisted text');

    const manager = new AutosaveManager({ storage: memory });
    const loaded = manager.load('# Default text');

    expect(loaded).toBe('# Persisted text');
  });

  it('returns fallback content when storage is empty', () => {
    const memory = new MemoryStorageAdapter();
    const manager = new AutosaveManager({ storage: memory });
    const loaded = manager.load('# Default text');

    expect(loaded).toBe('# Default text');
  });

  it('works when storage is completely unavailable', () => {
    // Adapter that claims it is unavailable
    const unavailableStorage: MemoryStorageAdapter = new MemoryStorageAdapter();
    vi.spyOn(unavailableStorage, 'isAvailable').mockReturnValue(false);

    const statuses: string[] = [];
    const manager = new AutosaveManager({
      storage: unavailableStorage,
      onStatusChange: (s) => statuses.push(s)
    });

    expect(manager.isStorageAvailable()).toBe(false);

    manager.saveImmediately('# Text');
    expect(statuses).toContain('unavailable');
    expect(manager.load('# Fallback')).toBe('# Text');
  });

  it('flushes pending save on window beforeunload event', () => {
    const memory = new MemoryStorageAdapter();
    const manager = new AutosaveManager({ storage: memory, debounceMs: 500 });

    manager.save('# Text before leaving');
    expect(memory.getItem(STORAGE_KEYS.CONTENT)).toBeNull();

    window.dispatchEvent(new Event('beforeunload'));
    expect(memory.getItem(STORAGE_KEYS.CONTENT)).toBe('# Text before leaving');
  });
});
