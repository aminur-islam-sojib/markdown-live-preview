export type ViewMode = 'split' | 'editor' | 'preview';
export type Theme = 'light' | 'dark';
export type Visibility = 'public' | 'unlisted' | 'private';

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface SaveStatus {
  text: string;
  type: 'saved' | 'saving' | 'offline' | 'error';
}

export interface NoteMetadata {
  title: string;
  description: string;
  tags: string;
  visibility: Visibility;
}
