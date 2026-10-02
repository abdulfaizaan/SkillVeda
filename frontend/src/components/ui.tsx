'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const CATEGORY_LABELS: Record<string, string> = {
  ai_ml: 'AI / ML',
  data_science: 'Data science',
  web_frontend: 'Web frontend',
  web_backend: 'Web backend',
  devops: 'DevOps',
  soft_skills: 'Soft skills',
  database: 'Databases',
  role: 'Role',
};

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function confidenceText(label: string | null | undefined): string {
  switch (label) {
    case 'high': return 'High confidence';
    case 'medium': return 'Medium confidence';
    case 'low': return 'Low confidence';
    case 'self-assessed': return 'Self-assessed';
    default: return 'Unknown confidence';
  }
}

export function buttonClass(variant: 'primary' | 'secondary' | 'ghost' = 'secondary', extra?: string): string {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  const variants = {
    primary: 'bg-primary text-[#03140d] hover:bg-primary-hover',
    secondary: 'border border-white/10 text-slate-200 hover:border-white/20 hover:bg-white/[0.04]',
    ghost: 'text-slate-400 hover:text-slate-100',
  };
  return cx(base, variants[variant], extra);
}

export const STATUS_META = {
  strong: { label: 'Strong', dot: 'bg-emerald-400', chip: 'border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200', bar: 'bg-emerald-400', text: 'text-emerald-300' },
  developing: { label: 'Developing', dot: 'bg-amber-400', chip: 'border-amber-400/25 bg-amber-400/[0.07] text-amber-200', bar: 'bg-amber-400', text: 'text-amber-300' },
  critical: { label: 'Critical gap', dot: 'bg-rose-400', chip: 'border-rose-400/25 bg-rose-400/[0.07] text-rose-200', bar: 'bg-rose-400', text: 'text-rose-300' },
  owned: { label: 'In your profile', dot: 'bg-sky-400', chip: 'border-sky-400/25 bg-sky-400/[0.07] text-sky-200', bar: 'bg-sky-400', text: 'text-sky-300' },
  context: { label: 'Context', dot: 'bg-slate-500', chip: 'border-white/10 bg-white/[0.03] text-slate-300', bar: 'bg-slate-500', text: 'text-slate-400' },
} as const;

export type StatusKey = keyof typeof STATUS_META;

function statusMeta(status: string | null | undefined, fallback: StatusKey = 'context') {
  return STATUS_META[(status && status in STATUS_META ? status : fallback) as StatusKey];
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-medium', meta.chip)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function LevelBar({ current, required, status, label }: { current: number; required?: number | null; status?: string; label?: string }) {
  const meta = statusMeta(status, 'owned');
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative h-1.5 w-full rounded-full bg-white/[0.06]"
      role="img"
      aria-label={label ?? `Current ${current}%${required != null ? `, required ${required}%` : ''}`}
    >
      <div className={cx('absolute inset-y-0 left-0 rounded-full', meta.bar)} style={{ width: `${clamp(current)}%` }} />
      {required != null ? (
        <div className="absolute -top-1 h-3.5 w-px bg-slate-200/70" style={{ left: `${clamp(required)}%` }} aria-hidden="true" />
      ) : null}
    </div>
  );
}

export function ReadinessRing({ score, size = 132, caption = 'Readiness' }: { score: number | null | undefined; size?: number; caption?: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {score != null ? (
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="#10B981" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * value) / 100}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cx('font-semibold tabular-nums text-slate-50', size >= 120 ? 'text-3xl' : 'text-xl')}>{score != null ? `${score}%` : '—'}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">{caption}</span>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/[0.06] pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-[28px]">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-end gap-3">{actions}</div> : null}
    </header>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cx('rounded-lg border border-white/[0.07] bg-[#070c18] p-5 md:p-6', className)}>{children}</section>;
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-3 text-sm text-slate-400', compact ? 'py-8' : 'min-h-[40vh]')}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-10 max-w-lg rounded-lg border border-rose-400/20 bg-rose-400/[0.04] p-6 text-center">
      <p className="text-sm font-medium text-rose-200">{message || 'Something went wrong.'}</p>
      {onRetry ? <button type="button" onClick={onRetry} className={buttonClass('secondary', 'mt-4')}>Try again</button> : null}
    </div>
  );
}

export function EmptyState({ title, detail, href, cta, children }: { title: string; detail?: React.ReactNode; href?: string; cta?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      {detail ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{detail}</p> : null}
      {href && cta ? <Link href={href} className={buttonClass('primary', 'mt-5')}>{cta}</Link> : null}
      {children}
    </div>
  );
}

export function DemoNotice({ note }: { note?: string }) {
  return (
    <p className="rounded-md border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3 text-xs leading-5 text-sky-100/80">
      <span className="mr-2 rounded bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200">Demo data</span>
      {note}
    </p>
  );
}

export function InlineAlert({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-md border border-rose-400/20 bg-rose-400/[0.05] px-3 py-2 text-xs text-rose-200">{message}</p>;
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close panel" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col border-l border-white/10 bg-[#060a15] shadow-2xl sm:w-[460px]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100" aria-label="Close panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
