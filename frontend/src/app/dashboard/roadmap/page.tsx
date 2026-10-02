'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RolePicker from '@/components/RolePicker';
import AskAI from '@/components/AskAI';
import { SkillDrawer } from '@/components/SkillDetail';
import { apiFetch, errorMessage } from '@/lib/api';
import { useIntelligence } from '@/lib/use-intelligence';
import type { Roadmap, RoadmapStatus, RoadmapStep } from '@/lib/types';
import { buttonClass, Card, CardTitle, cx, EmptyState, ErrorState, InlineAlert, LevelBar, LoadingState, PageHeader, plural } from '@/components/ui';

const STATUS_TEXT: Record<RoadmapStatus, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' };

function StepCard({ step, open, onToggle, onOpenSkill }: { step: RoadmapStep; open: boolean; onToggle: () => void; onOpenSkill: (id: string) => void }) {
  const { data, refresh } = useIntelligence();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(step.progress);
  const group = data?.recommended_courses.find((g) => g.skill_id === step.skill_id);

  const save = async (status: RoadmapStatus, value?: number) => {
    setSaving(true);
    setError('');
    try {
      const next = await apiFetch<Roadmap>('/api/student/roadmap/' + encodeURIComponent(step.skill_id), { method: 'PATCH', body: { status, progress: value ?? null } });
      const saved = next.steps.find((s) => s.skill_id === step.skill_id);
      if (saved) setProgress(saved.progress);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not save progress.'));
    } finally {
      setSaving(false);
    }
  };

  const done = step.status === 'completed';
  return (
    <li id={'step-' + step.skill_id} className="relative scroll-mt-24 pl-10">
      <span className={cx('absolute left-0 top-5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
        done ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200' : step.status === 'in_progress' ? 'border-amber-400/50 bg-amber-400/10 text-amber-200' : 'border-white/15 bg-[#070c18] text-slate-400')}>
        {done ? '✓' : step.order}
      </span>
      <article className={cx('rounded-lg border bg-[#070c18] p-5', open ? 'border-primary/30' : 'border-white/[0.07]')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={onToggle} aria-expanded={open} className="text-left text-base font-semibold text-slate-50 hover:underline">{step.skill_name}</button>
            <p className="mt-1 text-xs text-slate-500">
              {step.current_level}% → {step.target_level}% · about {plural(step.effort_weeks, 'week')} · {step.priority === 'HIGH' ? 'High priority' : 'Medium priority'}
            </p>
          </div>
          <span className="text-xs text-slate-400">{STATUS_TEXT[step.status]} · <span className="tabular-nums">{step.progress}%</span></span>
        </div>
        <div className="mt-3"><LevelBar current={step.current_level} required={step.target_level} status={step.priority === 'HIGH' ? 'critical' : 'developing'} /></div>

        {open ? (
          <div className="mt-5 flex flex-col gap-5 border-t border-white/[0.06] pt-5">
            <p className="text-sm leading-6 text-slate-300">{step.reason}</p>

            {step.prerequisites.length ? (
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">Prerequisites</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.prerequisites.map((p) => (
                    <button key={p.skill_id} type="button" onClick={() => onOpenSkill(p.skill_id)} className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-white/25">
                      {p.has_skill ? '✓ ' : ''}{p.skill_name} <span className="tabular-nums text-slate-500">{p.user_level}%</span>{p.in_plan ? <span className="text-slate-500"> · in plan</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">Recommended resources</p>
              {group?.courses.length ? (
                <ul className="flex flex-col gap-2">
                  {group.courses.map((course) => (
                    <li key={course.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/[0.06] px-3 py-2">
                      <div>
                        <p className="text-sm text-slate-100">{course.title}</p>
                        <p className="text-xs capitalize text-slate-500">{course.provider} · {course.level} · {plural(course.duration_weeks, 'week')}</p>
                      </div>
                      <a href={course.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open ↗</a>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">No course in the catalog teaches this skill yet.</p>}
              <Link href={'/dashboard/courses?skill=' + step.skill_id} className="mt-2 inline-block text-xs text-primary hover:underline">All courses for {step.skill_name} →</Link>
            </div>

            <div>
              <label htmlFor={'progress-' + step.skill_id} className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-slate-500">Progress <span className="tabular-nums text-slate-300">{progress}%</span></label>
              <input id={'progress-' + step.skill_id} type="range" min={0} max={100} step={10} value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                onPointerUp={() => void save(progress >= 100 ? 'completed' : progress <= 0 ? 'not_started' : 'in_progress', progress)}
                onKeyUp={(e) => { if (e.key.startsWith('Arrow')) void save(progress >= 100 ? 'completed' : progress <= 0 ? 'not_started' : 'in_progress', progress); }}
                disabled={saving} className="w-full accent-emerald-400" />
              <div className="mt-3 flex flex-wrap gap-2">
                {step.status !== 'in_progress' && !done ? <button type="button" disabled={saving} onClick={() => void save('in_progress')} className={buttonClass('secondary', 'text-xs')}>Start this step</button> : null}
                {!done ? <button type="button" disabled={saving} onClick={() => void save('completed')} className={buttonClass('primary', 'text-xs')}>Mark complete</button> : null}
                {step.status !== 'not_started' ? <button type="button" disabled={saving} onClick={() => void save('not_started')} className={buttonClass('ghost', 'text-xs')}>Reset</button> : null}
              </div>
              <div className="mt-2"><InlineAlert message={error} /></div>
              <p className="mt-2 text-xs text-slate-500">Progress tracks your learning plan. To change your measured skill level, re-analyze your resume or update it in My Skills.</p>
            </div>

            <AskAI skillId={step.skill_id} topic="roadmap" intro="Ask why this step sits here in your plan." />
          </div>
        ) : null}
      </article>
    </li>
  );
}

function RoadmapContent() {
  const { data, loading, error, refresh } = useIntelligence();
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get('skill'));
  const [skillDrawer, setSkillDrawer] = useState<string | null>(null);

  if (loading && !data) return <LoadingState label="Loading your roadmap…" />;
  if (!data) return <ErrorState message={error} onRetry={() => void refresh()} />;
  const roadmap = data.roadmap;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="My intelligence" title="Career Roadmap"
        description="Your gaps ordered so prerequisites come first. Durations are SkillVeda estimates based on the size of each gap."
        actions={<RolePicker id="roadmap-role" />} />

      {!data.has_skills ? (
        <EmptyState title="No skill profile yet" detail="Analyze your resume so SkillVeda can find your gaps and plan the order to close them." href="/dashboard/resume" cta="Analyze my resume" />
      ) : !roadmap ? (
        <EmptyState title="Choose a target career" detail="Pick a role above to generate your roadmap." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            {roadmap.foundation.length ? (
              <div className="mb-6">
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">Foundation you already have</p>
                <div className="flex flex-wrap gap-1.5">
                  {roadmap.foundation.map((f) => (
                    <button key={f.skill_id} type="button" onClick={() => setSkillDrawer(f.skill_id)} className="rounded border border-emerald-400/20 bg-emerald-400/[0.05] px-2 py-1 text-xs text-emerald-100">
                      ✓ {f.skill_name} <span className="tabular-nums text-emerald-300/70">{f.current_level}%</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {roadmap.steps.length ? (
              <ol className="relative flex flex-col gap-4 before:absolute before:bottom-6 before:left-[13px] before:top-6 before:w-px before:bg-white/10">
                {roadmap.steps.map((step) => (
                  <StepCard key={step.skill_id + step.progress + step.status} step={step} open={openId === step.skill_id}
                    onToggle={() => setOpenId(openId === step.skill_id ? null : step.skill_id)} onOpenSkill={setSkillDrawer} />
                ))}
              </ol>
            ) : <EmptyState title="No gaps to close" detail={'Your profile meets every requirement for ' + roadmap.role_title + '.'} href="/dashboard/jobs" cta="See matching jobs" />}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardTitle>Progress</CardTitle>
              <p className="text-3xl font-semibold tabular-nums text-slate-50">{roadmap.summary.percent_complete}%</p>
              <div className="mt-3"><LevelBar current={roadmap.summary.percent_complete} status="strong" label={'Roadmap ' + roadmap.summary.percent_complete + '% complete'} /></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Steps done</dt><dd className="tabular-nums text-slate-100">{roadmap.summary.completed_steps} / {roadmap.summary.total_steps}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Estimated</dt><dd className="tabular-nums text-slate-100">{plural(roadmap.summary.total_weeks, 'week')}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Progress is weighted by each step&apos;s estimated effort.</p>
            </Card>
            <AskAI topic="roadmap" label="Explain my roadmap" intro="Get a plain-language walkthrough of this plan." />
          </aside>
        </div>
      )}
      <SkillDrawer skillId={skillDrawer} onClose={() => setSkillDrawer(null)} onSelectSkill={setSkillDrawer} />
    </div>
  );
}

export default function RoadmapPage() {
  return <Suspense fallback={<LoadingState label="Loading your roadmap…" />}><RoadmapContent /></Suspense>;
}

