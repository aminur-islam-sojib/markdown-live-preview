import React, { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, Info, X } from 'lucide-react';
import { useModalAnimation } from '../hooks/useModalAnimation';

export type DialogVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  isAlert?: boolean;
  confirmButtonDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isAlert = false,
  confirmButtonDisabled = false,
  onConfirm,
  onCancel
}) => {
  const { isMounted, phase } = useModalAnimation(isOpen, 180);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Escape cancels, auto-focus confirm button
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Auto focus button after mount
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onCancel]);

  if (!isMounted) return null;

  // Icon & theme colors by variant
  const renderIcon = () => {
    switch (variant) {
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'info':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
      case 'danger':
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    const base = 'px-4 py-2 rounded-xl text-xs font-semibold text-white transition focus:outline-hidden focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
    switch (variant) {
      case 'warning':
        return `${base} bg-amber-600 hover:bg-amber-700 active:bg-amber-800 focus:ring-amber-500/40 shadow-sm shadow-amber-600/30`;
      case 'info':
        return `${base} bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500/40 shadow-sm shadow-blue-600/30`;
      case 'danger':
      default:
        return `${base} bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500/40 shadow-sm shadow-rose-600/30`;
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 modal-backdrop modal-backdrop-${phase}`}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className={`relative w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-black/5 dark:ring-white/10 z-10 dialog-spring dialog-spring-${phase} overflow-hidden p-5 text-xs text-slate-800 dark:text-slate-100`}
      >
        <div className="flex items-start gap-3.5">
          {renderIcon()}

          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="confirm-dialog-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug"
            >
              {title}
            </h3>
            <div
              id="confirm-dialog-desc"
              className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed"
            >
              {message}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition -mr-1 -mt-1"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-end gap-2.5">
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs active:scale-[0.98] transition focus:outline-hidden focus:ring-2 focus:ring-slate-400/20"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={confirmButtonDisabled}
            className={getConfirmButtonClasses()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
