'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Intelligence, ResumeAnalysis } from '@/lib/types';
import { useIntelligence } from '@/lib/use-intelligence';
import { Card, CardTitle, InlineAlert, LevelBar, PageHeader, buttonClass, confidenceText, cx, formatCategory } from '@/components/ui';

export default function ResumePage() {
  const { replace } = useIntelligence();
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const analyze = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      let result: ResumeAnalysis;
      if (mode === 'file') {
        if (!file) throw new Error('Choose a PDF, DOCX or TXT file first.');
        const form = new FormData();
        form.append('file', file);
        result = await apiFetch<ResumeAnalysis>('/api/student/resume/analyze', { method: 'POST', body: form, timeoutMs: 60000 });
      } else {
        result = await apiFetch<ResumeAnalysis>('/api/student/resume/analyze-text', { method: 'POST', body: { text }, timeoutMs: 60000 });
      }
      setAnalysis(result);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not analyze the resume.'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!analysis) return;
    setSaving(true);
    setError('');
    try {
      const next = await apiFetch<Intelligence>('/api/student/resume/apply', { method: 'POST', body: { analysis_id: analysis.analysis_id, replace: true } });
      replace(next);
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not update your skill profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Profile" title="Resume analysis" description="The SkillVeda NLP engine extracts skills with evidence and confidence. Nothing is saved until you choose to update your profile." />
      <Card>
        <div className="mb-4 flex gap-2" role="tablist" aria-label="Input type">
          {(['file', 'text'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={buttonClass(mode === m ? 'primary' : 'secondary')}>{m === 'file' ? 'Upload file' : 'Paste text'}</button>
          ))}
        </div>
        {mode === 'file' ? (
          <label className="block rounded-md border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
            <span className="block">{file ? file.name : 'PDF, DOCX or TXT'}</span>
            <input type="file" accept=".pdf,.docx,.txt" className="mt-3 text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <label className="block">
            <span className="sr-only">Resume text</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste your resume or project description" className="w-full rounded-md border border-white/10 bg-transparent p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none" />
          </label>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={analyze} disabled={busy || (mode === 'file' ? !file : text.trim().length < 10)} className={buttonClass('primary')}>{busy ? 'Analyzing…' : 'Analyze'}</button>
        </div>
        <div className="mt-3"><InlineAlert message={error} /></div>
      </Card>

      {analysis && (
        <Card>
          <CardTitle action={
            <button type="button" onClick={apply} disabled={saving || !analysis.skills.length} className={buttonClass('primary')}>{saving ? 'Saving…' : 'Update My Skill Profile'}</button>
          }>{analysis.total_skills_found} skills found{analysis.filename ? ` in ${analysis.filename}` : ''}</CardTitle>
          {saved && <p role="status" className="mb-4 text-sm text-emerald-300">Profile updated. <Link href="/dashboard/gap" className="underline">See your gap analysis</Link>.</p>}
          {!analysis.skills.length ? <p className="text-sm text-slate-400">No known skills were detected. Try adding more detail about tools and projects.</p> : (
            <ul className="divide-y divide-white/5">
              {analysis.skills.map((s) => (
                <li key={s.skill_id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-100">{s.skill_name} <span className="text-xs text-slate-500">· {formatCategory(s.category)}</span></span>
                    <span className={cx('text-xs', s.confidence_label === 'high' ? 'text-emerald-300' : s.confidence_label === 'medium' ? 'text-amber-300' : 'text-slate-400')}>{confidenceText(s.confidence_label)}</span>
                  </div>
                  <div className="mt-2"><LevelBar current={s.proficiency} label={`Level ${s.proficiency}`} /></div>
                  {s.evidence && <p className="mt-2 text-xs italic leading-5 text-slate-400">“{s.evidence}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
