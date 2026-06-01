import React from 'react';
import { useToastStore } from '../store/toastStore';

export default function Button({ children, variant = 'primary', className = '', feedback, onClick, ...props }) {
  const showToast = useToastStore((state) => state.showToast);
  const styles = {
    primary: 'bg-brand-blue text-white shadow-soft',
    secondary: 'bg-white text-brand-text border border-slate-200',
    ghost: 'bg-transparent text-brand-muted',
    danger: 'bg-brand-coral text-white'
  };
  function handleClick(event) {
    if (feedback) showToast(feedback, 'info');
    onClick?.(event);
  }

  return (
    <button className={`touch rounded-[22px] px-5 py-3 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${styles[variant]} ${className}`} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
