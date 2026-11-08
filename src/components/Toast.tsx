import React, { useEffect } from 'react';
import { CheckCircle2, Cloud, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'cloud' | 'info' | 'warning' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-10 right-6 z-50 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/10 text-xs text-slate-800 dark:text-slate-100 max-w-sm">
        {toast.type === 'cloud' && <Cloud className="w-4 h-4 text-blue-500 shrink-0" />}
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
        {toast.type === 'info' && <Info className="w-4 h-4 text-slate-400 shrink-0" />}
        {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}

        <span className="font-medium truncate">{toast.message}</span>

        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onClose();
            }}
            className="ml-1 px-2 py-0.5 rounded-md font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition shrink-0 underline"
          >
            {toast.action.label}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 ml-1"
          aria-label="Dismiss toast"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
