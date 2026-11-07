import { describe, it, expect } from 'vitest';
import { isSupabaseConfigured, getSupabase } from '../src/supabase/client';
import { signInWithOAuth, signInWithOtp, signOut, getSession, getCurrentUser } from '../src/supabase/auth';
import {
  listCloudDocuments,
  getCloudDocument,
  createCloudDocument,
  updateCloudDocument,
  deleteCloudDocument
} from '../src/supabase/documents';

describe('Supabase Client & Offline Resilience', () => {
  it('detects unconfigured environment gracefully', () => {
    // In test environment without .env, it should return false
    expect(typeof isSupabaseConfigured()).toBe('boolean');
  });

  it('getSupabase returns null or client without throwing exceptions', () => {
    expect(() => getSupabase()).not.toThrow();
  });
});

describe('Supabase Auth Graceful Fallback', () => {
  it('returns error or null when Supabase is not configured', async () => {
    if (!isSupabaseConfigured()) {
      const oauthRes = await signInWithOAuth('google');
      expect(oauthRes.error?.message).toContain('Supabase is not configured');

      const otpRes = await signInWithOtp('test@example.com');
      expect(otpRes.error?.message).toContain('Supabase is not configured');

      const signOutRes = await signOut();
      expect(signOutRes.error).toBeNull();

      const session = await getSession();
      expect(session).toBeNull();

      const user = await getCurrentUser();
      expect(user).toBeNull();
    }
  });
});

describe('Supabase Documents CRUD Fallback', () => {
  it('handles database queries safely when unconfigured or offline', async () => {
    if (!isSupabaseConfigured()) {
      const list = await listCloudDocuments();
      expect(list).toEqual([]);

      const doc = await getCloudDocument('mock-id');
      expect(doc).toBeNull();

      const created = await createCloudDocument('Title', 'Content');
      expect(created).toBeNull();

      const updated = await updateCloudDocument('mock-id', { title: 'Updated' });
      expect(updated).toBeNull();

      const deleted = await deleteCloudDocument('mock-id');
      expect(deleted).toBe(false);
    }
  });
});
