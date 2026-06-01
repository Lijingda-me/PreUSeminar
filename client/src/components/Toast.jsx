import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

const styles = {
  success: 'bg-brand-green text-white',
  error: 'bg-brand-coral text-white',
  info: 'bg-brand-text text-white'
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export default function Toast() {
  const toast = useToastStore((state) => state.toast);
  if (!toast) return null;
  const Icon = icons[toast.type] || Info;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[70] mx-auto max-w-md px-4">
      <div className={`mx-auto flex w-fit max-w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow-soft ${styles[toast.type] || styles.info}`}>
        <Icon size={18} aria-hidden="true" />
        <span className="min-w-0 break-words">{toast.message}</span>
      </div>
    </div>
  );
}
