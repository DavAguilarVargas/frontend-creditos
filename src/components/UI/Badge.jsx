import React from 'react';

const VARIANTS = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-sky-100 text-sky-800 border-sky-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  const styles = VARIANTS[variant] || VARIANTS.neutral;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}
    >
      {children}
    </span>
  );
}