'use client';

import React from 'react';
import Link from 'next/link';
import RolePicker from '@/components/RolePicker';
import AskAI from '@/components/AskAI';
import { useIntelligence } from '@/lib/use-intelligence';
import { buttonClass, Card, CardTitle, EmptyState, ErrorState, formatDate, LevelBar, LoadingState, PageHeader, ReadinessRing, StatusBadge } from '@/components/ui';

export default function OverviewPage() {
  const { data, loading, error, refresh } = useIntelligence();

  if (loading && !data) return <LoadingState label="Loading your SkillVeda profile…" />;
  if (!data) return <ErrorState message={error} onRetry={() => void refresh()} />;

  const name = data.student.name.trim();
  const readiness = data.readiness;
  const roadmap = data.roadmap;
  const gaps = [...data.critical_gaps, ...data.developing_skills].slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title={name ? `Welcome back, ${name}` : 'Welcome to SkillVeda'}
        description={data.target_role
          ? `Where you stand for ${data.target_role.title}, based on your skill profile and the SkillVeda role taxonomy.`
          : 'Choose a target career to see how your skills compare with what the role requires.'}
        actions={<RolePicker id="overview-role" />}
      />

      {!data.has_skills ? (
        <EmptyState
          title="Start with your resume"
          detail="The SkillVeda NLP reads your resume, detects your skills and estimates proficiency. Everything else on this dashboard is built from that profile."
          href="/dashboard/resume"
          cta="Analyze my resume"
        />
      ) : !data.target_role ? (
        <EmptyState title="Choose a target career" detail={`You have ${data.skills.length} skills in your profile. Pick a role above to see your readiness, gaps and roadmap.`} />
      ) : null}

      {readiness ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card>
            <CardTitle>Role readiness</CardTitle>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <ReadinessRing score={readiness.score} />
              <dl className="grid w-full flex-1 grid-cols-1 gap-3 text-sm">
                {[
                  { label: 'Strong', value: readiness.strong_count, status: 'strong' },
                  { label: 'Developing', value: readiness.developing_count, status: 'developing' },
                  { label: 'Critical gaps', value: readiness.critical_count, status: 'critical' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-white/[0.05] pb-2 last:border-0">
                    <dt><StatusBadge status={row.status} /></dt>
                    <dd className="tabular-nums text-slate-100">{row.value} <span className="text-slate-500">/ {readiness.total_required}</span></dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Demand-weighted coverage of the {readiness.total_required} skills {data.target_role?.title} requires. Partial progress counts.
            </p>
          </Card>

          <Card>
            <CardTitle>Recommended next actions</CardTitle>
            <ol className="flex flex-col gap-3">
              {data.next_actions.map((action, index) => (
                <li key={action.title}>
                  <Link href={action.href} className="group flex items-start gap-4 rounded-md border border-white/[0.06] p-3 hover:border-white/15 hover:bg-white/[0.02]">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 text-xs tabular-nums text-primary">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-100">{action.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{action.detail}</span>
                    </span>
                    <span className="text-slate-600 group-hover:text-slate-300" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      ) : null}

      {readiness ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle action={<Link href="/dashboard/gap" className="text-xs text-primary hover:underline">All gaps →</Link>}>Largest skill gaps</CardTitle>
            {gaps.length ? (
              <ul className="flex flex-col gap-4">
                {gaps.map((gap) => (
                  <li key={gap.skill_id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-100">{gap.skill_name}</span>
                      <span className="tabular-nums text-xs text-slate-400">{gap.user_proficiency}% / {gap.required_proficiency}%</span>
                    </div>
                    <LevelBar current={gap.user_proficiency} required={gap.required_proficiency} status={gap.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">No gaps left for this role.</p>}
          </Card>

          <Card>
            <CardTitle action={<Link href="/dashboard/roadmap" className="text-xs text-primary hover:underline">Open roadmap →</Link>}>Roadmap progress</CardTitle>
            {roadmap && roadmap.steps.length ? (
              <>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold tabular-nums text-slate-50">{roadmap.summary.percent_complete}%</p>
                  <p className="text-xs text-slate-400">{roadmap.summary.completed_steps} of {roadmap.summary.total_steps} steps done · ~{roadmap.summary.total_weeks} weeks total</p>
                </div>
                <div className="mt-3"><LevelBar current={roadmap.summary.percent_complete} status="strong" label={`Roadmap ${roadmap.summary.percent_complete}% complete`} /></div>
                <ul className="mt-5 flex flex-col gap-2 text-sm">
                  {roadmap.steps.slice(0, 4).map((step) => (
                    <li key={step.skill_id} className="flex items-center justify-between gap-3">
                      <span className={step.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}>{step.order}. {step.skill_name}</span>
                      <span className="text-xs text-slate-500">{step.status === 'completed' ? 'Done' : step.status === 'in_progress' ? `${step.progress}%` : `~${step.effort_weeks}w`}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="text-sm text-slate-400">You already meet every requirement for this role.</p>}
          </Card>
        </div>
      ) : null}

      {readiness ? <AskAI topic="readiness" label="Summarize with AI" intro="Get a short summary of where you stand and what to do next, based on the numbers above." /> : null}

      {data.activity.length ? (
        <Card>
          <CardTitle>Recent activity</CardTitle>
          <ul className="flex flex-col divide-y divide-white/[0.05]">
            {data.activity.slice(0, 5).map((item, index) => (
              <li key={index} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="text-slate-300">{item.message}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatDate(item.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.has_skills && !readiness ? <Link href="/dashboard/skills" className={buttonClass('secondary', 'self-start')}>Review my skills</Link> : null}
    </div>
  );
}
