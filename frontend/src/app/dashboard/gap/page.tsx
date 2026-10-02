'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import RolePicker from '@/components/RolePicker';
import { SkillDrawer } from '@/components/SkillDetail';
import AskAI from '@/components/AskAI';
import { useIntelligence } from '@/lib/use-intelligence';
import type { GapItem } from '@/lib/types';
import { buttonClass, Card, cx, EmptyState, ErrorState, LevelBar, LoadingState, PageHeader, ReadinessRing, STATUS_META, StatusBadge } from '@/components/ui';

function GapCard({ item, onOpen }: { item: GapItem; onOpen: (id: string) => void }) {
  const [explainOpen, setExplainOpen] = useState(false);
  return (
    <article className="rounded-lg border border-white/[0.07] bg-[#070c18] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => onOpen(item.skill_id)} className="text-left text-base font-semibold text-slate-50 hover:underline">{item.skill_name}</button>
          <p className="mt-1 text-xs capitalize text-slate-500">{item.importance} skill · demand {Math.round(item.demand_weight * 100)}%</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Current</dt><dd className="mt-0.5 tabular-nums text-slate-100">{item.user_proficiency}%</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Required</dt><dd className="mt-0.5 tabular-nums text-slate-100">{item.required_proficiency}%</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-slate-500">Gap</dt><dd className={cx('mt-0.5 tabular-nums', STATUS_META[item.status].text)}>{item.gap} pts</dd></div>
      </dl>
      <div className="mt-3"><LevelBar current={item.user_proficiency} required={item.required_proficiency} status={item.status} /></div>

      {item.status !== 'strong' ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setExplainOpen((open) => !open)} aria-expanded={explainOpen} className={buttonClass('secondary', 'text-xs')}>Why do I need this?</button>
            <Link href={`/dashboard/roadmap?skill=${item.skill_id}`} className={buttonClass('secondary', 'text-xs')}>View roadmap</Link>
            <Link href={`/dashboard/courses?skill=${item.skill_id}`} className={buttonClass('secondary', 'text-xs')}>Find courses</Link>
          </div>
          {explainOpen ? (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm leading-6 text-slate-300">{item.reason}</p>
              <AskAI skillId={item.skill_id} intro="Want this in plainer words, with context from your roadmap?" />
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

export default function SkillGapPage() {
  const { data, loading, error, refresh } = useIntelligence();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading && !data) return <LoadingState label="Loading gap analysis…" />;
  if (!data) return <ErrorState message={error} onRetry={() => void refresh()} />;

  const sections: Array<{ key: 'critical' | 'developing' | 'strong'; title: string; items: GapItem[]; note: string }> = [
    { key: 'critical', title: 'Critical gaps', items: data.critical_gaps, note: 'Below 40% of the required level.' },
    { key: 'developing', title: 'Developing skills', items: data.developing_skills, note: 'Between 40% and 80% of the required level.' },
    { key: 'strong', title: 'Strong skills', items: data.strong_skills, note: 'At least 80% of the required level.' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="My intelligence"
        title="Skill Gap"
        description="Your skill profile compared with the target role's requirements, calculated by the SkillVeda gap engine."
        actions={<RolePicker id="gap-role" />}
      />

      {!data.has_skills ? (
        <EmptyState title="No skill profile yet" detail="Analyze your resume first, then SkillVeda compares it with your target role." href="/dashboard/resume" cta="Analyze my resume" />
      ) : !data.readiness ? (
        <EmptyState title="Choose a target career" detail="Pick a role above to compare your skills with its requirements." />
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <ReadinessRing score={data.readiness.score} size={112} />
              <div className="grid flex-1 grid-cols-3 gap-4">
                {sections.map((section) => (
                  <a key={section.key} href={`#${section.key}`} className="rounded-md border border-white/[0.06] p-3 hover:border-white/15">
                    <StatusBadge status={section.key} />
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">{section.items.length}</p>
                  </a>
                ))}
              </div>
            </div>
          </Card>

          {sections.map((section) => (
            <section key={section.key} id={section.key} className="scroll-mt-24">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-100">{section.title} <span className="ml-1 text-sm tabular-nums text-slate-500">{section.items.length}</span></h2>
                <p className="text-xs text-slate-500">{section.note}</p>
              </div>
              {section.items.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {section.items.map((item) => <GapCard key={item.skill_id} item={item} onOpen={setSelected} />)}
                </div>
              ) : <p className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">None.</p>}
            </section>
          ))}

          {data.other_skills.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-100">Other skills you have</h2>
              <p className="mb-3 text-xs text-slate-500">Not required for {data.target_role?.title}, but part of your profile.</p>
              <div className="flex flex-wrap gap-1.5">
                {data.other_skills.map((skill) => (
                  <button key={skill.skill_id} type="button" onClick={() => setSelected(skill.skill_id)} className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-white/25">
                    {skill.skill_name} <span className="tabular-nums text-slate-500">{skill.user_proficiency}%</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <SkillDrawer skillId={selected} onClose={() => setSelected(null)} onSelectSkill={setSelected} />
    </div>
  );
}
