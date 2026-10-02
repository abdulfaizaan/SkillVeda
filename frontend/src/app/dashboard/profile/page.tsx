'use client';

import React, { FormEvent, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import { useIntelligence } from '@/lib/use-intelligence';
import RolePicker from '@/components/RolePicker';
import { buttonClass, Card, ErrorState, InlineAlert, LoadingState, PageHeader } from '@/components/ui';

type ProfileFields = { name: string; education: string; institution: string };

function ProfileForm({ initial }: { initial: ProfileFields }) {
  const { refresh } = useIntelligence();
  const [profile, setProfile] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  const update = (key: keyof ProfileFields, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setStatus('idle');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      await apiFetch('/api/student/profile', { method: 'PUT', body: profile });
      await refresh();
      setStatus('saved');
    } catch (cause) {
      setError(errorMessage(cause, 'Could not save your profile.'));
      setStatus('idle');
    }
  };

  const field = (key: keyof ProfileFields, label: string, placeholder: string, max: number, autoComplete?: string) => (
    <label className="flex flex-col gap-1.5 text-sm text-slate-300">
      {label}
      <input value={profile[key]} maxLength={max} autoComplete={autoComplete} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="rounded-md border border-white/10 bg-[#0a1020] px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-primary/50 focus:outline-none" />
    </label>
  );

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-5">
      {field('name', 'Name', 'Your name', 120, 'name')}
      {field('education', 'Education / year', 'e.g. B.Tech Computer Science, 3rd year', 160)}
      {field('institution', 'Institution', 'College or university', 160, 'organization')}
      <InlineAlert message={error} />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={status === 'saving'} className={buttonClass('primary')}>{status === 'saving' ? 'Saving…' : 'Save profile'}</button>
        {status === 'saved' ? <span role="status" className="text-sm text-primary">Saved.</span> : null}
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { data, loading, error, refresh } = useIntelligence();
  if (loading && !data) return <LoadingState />;
  if (!data) return <ErrorState message={error} onRetry={() => void refresh()} />;
  const { name, education, institution } = data.student;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow="Account" title="Profile" description="Your details and target career. Stored in the local SkillVeda database on this machine." />
      <Card><ProfileForm key={data.student.id} initial={{ name, education, institution }} /></Card>
      <Card><RolePicker id="profile-role" /></Card>
    </div>
  );
}
