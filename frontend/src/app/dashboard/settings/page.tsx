'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, errorMessage, resetStudentId } from '@/lib/api';
import { LEGACY_STORAGE_KEYS } from '@/lib/student-profile';
import type { AIStatus } from '@/lib/types';
import { useIntelligence } from '@/lib/use-intelligence';
import { buttonClass, Card, CardTitle, InlineAlert, PageHeader } from '@/components/ui';

export default function SettingsPage() {
  const { refresh } = useIntelligence();
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<AIStatus>('/api/ai/status')
      .then((status) => { if (active) setAiStatus(status); })
      .catch((cause) => { if (active) setAiError(errorMessage(cause, 'Could not check the AI assistant.')); });
    return () => { active = false; };
  }, []);

  const clearData = async () => {
    if (!window.confirm('Delete your profile, skills, target role and roadmap progress from the local SkillVeda database? This cannot be undone.')) return;
    setError('');
    try {
      await apiFetch('/api/student/profile', { method: 'DELETE' });
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      resetStudentId();
      await refresh();
      setCleared(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not delete your data.'));
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow="Account" title="Settings" />

      <Card>
        <CardTitle>AI assistant</CardTitle>
        {aiStatus ? (
          aiStatus.enabled ? (
            <p className="text-sm text-slate-300">Connected: <span className="text-slate-100">{aiStatus.provider}</span> · {aiStatus.model}</p>
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              Not configured. SkillVeda works fully without it and shows its own explanations. To enable AI explanations, set <code className="text-slate-200">LLM_PROVIDER</code>, <code className="text-slate-200">LLM_MODEL</code> and <code className="text-slate-200">LLM_API_KEY</code> in <code className="text-slate-200">SkillVeda/.env</code> and restart the backend.
            </p>
          )
        ) : aiError ? <InlineAlert message={aiError} /> : <p className="text-sm text-slate-500">Checking…</p>}
        <p className="mt-3 text-xs text-slate-500">API keys live only in the backend and are never sent to the browser.</p>
      </Card>

      <Card>
        <CardTitle>Your data</CardTitle>
        <p className="mb-5 text-sm leading-6 text-slate-400">Your profile, skills, target role, roadmap progress and saved explanations are stored in the local SkillVeda database, linked to an anonymous ID in this browser.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => void clearData()} className={buttonClass('secondary', 'border-rose-400/30 text-rose-200 hover:bg-rose-400/[0.06]')}>Delete my SkillVeda data</button>
          {cleared ? <span role="status" className="text-sm text-primary">Your data was deleted.</span> : null}
        </div>
        <div className="mt-3"><InlineAlert message={error} /></div>
      </Card>
    </div>
  );
}
