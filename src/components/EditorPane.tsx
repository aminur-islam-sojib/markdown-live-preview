import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { CursorPosition, Theme } from '../types';

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onSaveTrigger: () => void;
  theme: Theme;
  onScrollChange?: (scrollTop: number, scrollHeight: number, height: number) => void;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  value,
  onChange,
  onCursorChange,
  onSaveTrigger,
  theme,
  onScrollChange,
  editorRef
}) => {
  const saveTriggerRef = useRef(onSaveTrigger);
  saveTriggerRef.current = onSaveTrigger;

  const onScrollChangeRef = useRef(onScrollChange);
  onScrollChangeRef.current = onScrollChange;

  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Track cursor movement
    editor.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });

    // Intercept Ctrl+S / Cmd+S in Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveTriggerRef.current();
    });

    // Sync scroll
    editor.onDidScrollChange((e) => {
      if (onScrollChangeRef.current) {
        const layout = editor.getLayoutInfo();
        onScrollChangeRef.current(e.scrollTop, e.scrollHeight, layout.height);
      }
    });

    // Set initial layout
    setTimeout(() => editor.layout(), 50);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-white dark:bg-[#1e1e1e]">
      <Editor
        height="100%"
        language="markdown"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible'
          },
          folding: false,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          padding: { top: 12, bottom: 12 }
        }}
      />
    </div>
  );
};
