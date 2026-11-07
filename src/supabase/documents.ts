import { getSupabase } from './client';

export interface CloudDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lists all cloud documents belonging to the authenticated user, ordered by most recently modified.
 */
export async function listCloudDocuments(): Promise<CloudDocument[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('id, user_id, title, content, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Failed to list cloud documents:', error.message);
    return [];
  }

  return (data as CloudDocument[]) || [];
}

/**
 * Fetches a single cloud document by its ID.
 */
export async function getCloudDocument(id: string): Promise<CloudDocument | null> {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CloudDocument;
}

/**
 * Creates a new cloud document for the authenticated user.
 */
export async function createCloudDocument(
  title: string,
  content: string
): Promise<CloudDocument | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cleanTitle = title.trim() || 'Untitled Document';

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: cleanTitle,
      content,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error || !data) {
    console.warn('Failed to create cloud document:', error?.message);
    return null;
  }

  return data as CloudDocument;
}

/**
 * Updates an existing cloud document with new title, content, and updated_at timestamp.
 */
export async function updateCloudDocument(
  id: string,
  updates: { title?: string; content?: string }
): Promise<CloudDocument | null> {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (typeof updates.title === 'string') {
    payload.title = updates.title.trim() || 'Untitled Document';
  }
  if (typeof updates.content === 'string') {
    payload.content = updates.content;
  }

  const { data, error } = await supabase
    .from('documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.warn('Failed to update cloud document:', error?.message);
    return null;
  }

  return data as CloudDocument;
}

/**
 * Deletes a cloud document by its ID.
 */
export async function deleteCloudDocument(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !id) return false;

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('Failed to delete cloud document:', error.message);
    return false;
  }

  return true;
}
