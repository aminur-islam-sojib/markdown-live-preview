import { describe, it, expect, vi } from 'vitest';
import { isSupabaseConfigured, getSupabase } from '../src/supabase/client';
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithOAuth,
  signInWithOtp,
  signOut,
  getSession,
  getCurrentUser
} from '../src/supabase/auth';
import {
  listCloudDocuments,
  getCloudDocument,
  createCloudDocument,
  updateCloudDocument,
  deleteCloudDocument
} from '../src/supabase/documents';

describe('Supabase Client & Offline Resilience', () => {
  it('detects unconfigured environment gracefully', () => {
    expect(typeof isSupabaseConfigured()).toBe('boolean');
  });

  it('getSupabase returns null or client without throwing exceptions', () => {
    expect(() => getSupabase()).not.toThrow();
  });
});

describe('Supabase Auth Operations', () => {
  it('handles sign in and sign up gracefully', async () => {
    if (!isSupabaseConfigured()) {
      const signInRes = await signInWithPassword('test@example.com', 'pass123');
      expect(signInRes.error?.message).toContain('Supabase is not configured');
      expect(signInRes.user).toBeNull();

      const signUpRes = await signUpWithPassword('test@example.com', 'pass123');
      expect(signUpRes.error?.message).toContain('Supabase is not configured');
      expect(signUpRes.user).toBeNull();

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
    } else {
      // In configured environment, invalid credentials return structured error rather than throwing
      const signInRes = await signInWithPassword('nonexistent-user@invalid-domain-test.xyz', 'wrongpassword');
      expect(signInRes.user).toBeNull();
      expect(signInRes.error).toBeDefined();

      const session = await getSession();
      expect(session === null || typeof session === 'object').toBe(true);
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
