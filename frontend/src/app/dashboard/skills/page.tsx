'use client';

import React, { useMemo, useState } from 'react';
import { SkillDrawer } from '@/components/SkillDetail';
import { useIntelligence } from '@/lib/use-intelligence';
import { confidenceText, cx, EmptyState, ErrorState, formatCategory, LevelBar, LoadingState, PageHeader } from '@/components/ui';

export default function MySkillsPage() {
  const { data, loading, error, refresh } = useIntelligence();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    (data?.skills ?? []).forEach((skill) => counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  if (loading && !data) return <LoadingState label="Loading your skills…" />;
  if (!data) return <ErrorState message={error} onRetry={() => void refresh()} />;

  const needle = query.trim().toLowerCase();
  const visible = data.skills.filter((skill) =>
    (category === 'all' || skill.category === category) && (!needle || skill.skill_name.toLowerCase().includes(needle)),
  );
  const requiredIds = new Set([...data.strong_skills, ...data.developing_skills, ...data.critical_gaps].map((item) => item.skill_id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My intelligence"
        title="My Skills"
        description="Skills detected by the SkillVeda NLP, with estimated proficiency, match confidence and the resume text they came from. Select a skill for details."
      />

      {!data.has_skills ? (
        <EmptyState title="No skills yet" detail="Analyze your resume to build your skill profile." href="/dashboard/resume" cta="Open Resume Analyzer" />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
              {[['all', data.skills.length] as [string, number], ...categories].map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  aria-pressed={category === key}
                  className={cx('rounded-md border px-3 py-1.5 text-xs', category === key ? 'border-primary/40 bg-primary/[0.08] text-slate-50' : 'border-white/10 text-slate-400 hover:text-slate-100')}
                >
                  {key === 'all' ? 'All' : formatCategory(key)} <span className="ml-1 tabular-nums text-slate-500">{count}</span>
                </button>
              ))}
            </div>
            <label className="relative md:w-64">
              <span className="sr-only">Filter skills</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter skills…" className="w-full rounded-md border border-white/10 bg-[#0a1020] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-primary/50 focus:outline-none" />
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/[0.07]">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-4 border-b border-white/[0.07] bg-white/[0.02] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
              <span>Skill</span><span>Category</span><span>Proficiency</span><span>Confidence</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {visible.map((skill) => (
                <li key={skill.skill_id}>
                  <button type="button" onClick={() => setSelected(skill.skill_id)} className="grid w-full grid-cols-1 gap-2 px-5 py-4 text-left hover:bg-white/[0.02] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] md:items-center md:gap-4">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-100">
                        {skill.skill_name}
                        {requiredIds.has(skill.skill_id) ? <span className="ml-2 rounded border border-primary/25 px-1.5 py-0.5 text-[10px] font-normal text-primary">Role skill</span> : null}
                      </span>
                      {skill.evidence ? <span className="mt-1 block truncate text-xs text-slate-500">“{skill.evidence}”</span> : null}
                    </span>
                    <span className="text-xs text-slate-400">{formatCategory(skill.category)}</span>
                    <span className="flex items-center gap-3">
                      <span className="flex-1"><LevelBar current={skill.proficiency} status="owned" /></span>
                      <span className="w-10 text-right text-sm tabular-nums text-slate-200">{skill.proficiency}%</span>
                    </span>
                    <span className="text-xs text-slate-400">{confidenceText(skill.confidence_label)}</span>
                  </button>
                </li>
              ))}
              {!visible.length ? <li className="px-5 py-8 text-center text-sm text-slate-500">No skills match this filter.</li> : null}
            </ul>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Proficiency is estimated from the words around each skill in your resume (for example “built”, “3 years”, “familiar”). Confidence describes how certain the skill match is, not how skilled you are. You can adjust any level from its detail panel.
          </p>
        </>
      )}

      <SkillDrawer skillId={selected} onClose={() => setSelected(null)} onSelectSkill={setSelected} editable />
    </div>
  );
}
