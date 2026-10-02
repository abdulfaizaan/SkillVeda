'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { CatalogMeta, JobMatch, JobSummary } from '@/lib/types';
import { Card, CardTitle, DemoNotice, Drawer, EmptyState, ErrorState, InlineAlert, LoadingState, PageHeader, cx } from '@/components/ui';

type JobsResponse = { target_role: { id: string; title: string } | null; has_skills: boolean; catalog: CatalogMeta; jobs: JobSummary[] };

function scoreClass(score: number) {
  return score >= 70 ? 'text-emerald-300' : score >= 40 ? 'text-amber-300' : 'text-rose-300';
}

function SkillList({ title, items, tone }: { title: string; items: Array<{ skill_id: string; skill_name: string; user_proficiency?: number; required_proficiency?: number }>; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.skill_id} className="flex justify-between text-sm"><span className={tone}>{s.skill_name}</span>{s.required_proficiency !== undefined && <span className="text-xs text-slate-500">{s.user_proficiency ?? 0} / {s.required_proficiency}</span>}</li>
        ))}
      </ul>
    </div>
  );
}

export default function JobsPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobMatch | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch<JobsResponse>('/api/student/jobs')
      .then((next) => { if (active) { setData(next); setError(''); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, 'Could not load jobs.')); });
    return () => { active = false; };
  }, [reload]);

  const openJob = (id: string) => {
    setSelected(id);
    setDetail(null);
    setDetailError('');
    apiFetch<JobMatch>(`/api/student/jobs/${encodeURIComponent(id)}`)
      .then(setDetail)
      .catch((cause) => setDetailError(errorMessage(cause, 'Could not load this job.')));
  };

  if (error) return <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />;
  if (!data) return <LoadingState label="Loading jobs…" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Careers" title="Jobs" description="Match scores come from the SkillVeda gap engine against each posting's required skills." />
      {data.catalog.is_demo && <DemoNotice note={data.catalog.note ?? 'These job postings are seeded demo data, not live listings.'} />}
      <Card>
        <CardTitle>{data.target_role ? `Roles like ${data.target_role.title}` : 'All postings'}</CardTitle>
        {!data.has_skills && <p className="mb-3 text-xs text-slate-500">Add skills to your profile to get real match scores.</p>}
        {data.jobs.length === 0 ? (
          <EmptyState title="No jobs found" />
        ) : (
          <ul className="divide-y divide-white/5">
            {data.jobs.map((job) => (
              <li key={job.id}>
                <button type="button" onClick={() => openJob(job.id)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-white/[0.02]">
                  <span>
                    <span className="block text-sm font-medium text-slate-100">{job.title}</span>
                    <span className="block text-xs text-slate-400">{job.company} · {job.location} · {job.employment_type}</span>
                  </span>
                  <span className={cx('text-lg font-semibold tabular-nums', scoreClass(job.match_score))}>{Math.round(job.match_score)}%</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={detail?.title ?? 'Job match'}>
        {detailError ? <InlineAlert message={detailError} /> : !detail ? <LoadingState compact /> : (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-slate-300">{detail.company} · {detail.location}</p>
              <p className={cx('mt-2 text-3xl font-semibold', scoreClass(detail.match_score))}>{Math.round(detail.match_score)}% match</p>
              {detail.description && <p className="mt-3 text-sm leading-6 text-slate-400">{detail.description}</p>}
            </div>
            <SkillList title="Strong matches" items={detail.strong_matches} tone="text-emerald-200" />
            <SkillList title="Developing" items={detail.developing} tone="text-amber-200" />
            <SkillList title="Missing" items={detail.missing} tone="text-rose-200" />
            {detail.preferred_skills.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Preferred</p>
                <div className="flex flex-wrap gap-1.5">{detail.preferred_skills.map((s) => <span key={s.skill_id} className={cx('rounded border px-1.5 py-0.5 text-[11px]', s.has_skill ? 'border-emerald-400/30 text-emerald-200' : 'border-white/10 text-slate-400')}>{s.skill_name}</span>)}</div>
              </div>
            )}
            {detail.preparation.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">How to prepare</p>
                <ul className="space-y-2 text-sm">
                  {detail.preparation.map((p) => (
                    <li key={p.skill_id} className="text-slate-300">{p.skill_name} <span className="text-xs text-slate-500">(gap {p.gap})</span>{p.course && <> — <a href={p.course.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{p.course.title}</a></>}</li>
                  ))}
                </ul>
              </div>
            )}
            {detail.source_url && <a href={detail.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View source posting</a>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
