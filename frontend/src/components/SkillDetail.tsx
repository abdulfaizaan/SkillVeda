'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api';
import type { RelatedRef, SkillDetail as SkillDetailData } from '@/lib/types';
import { useIntelligence } from '@/lib/use-intelligence';
import AskAI from './AskAI';
import { buttonClass, confidenceText, cx, Drawer, formatCategory, InlineAlert, LevelBar, LoadingState } from './ui';

function SkillChips({ items, onSelect, empty = 'None listed in the taxonomy.' }: { items: RelatedRef[]; onSelect?: (id: string) => void; empty?: string }) {
  if (!items.length) return <p className="text-xs text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const owned = (item.user_level ?? 0) > 0;
        const className = cx('rounded border px-2 py-1 text-xs', owned ? 'border-sky-400/25 text-sky-100' : 'border-white/10 text-slate-300');
        const content = (
          <>
            {item.skill_name}
            {owned ? <span className="ml-1.5 tabular-nums text-slate-500">{item.user_level}%</span> : null}
          </>
        );
        return onSelect ? (
          <button key={item.skill_id} type="button" onClick={() => onSelect(item.skill_id)} className={cx(className, 'hover:border-white/30')}>{content}</button>
        ) : (
          <span key={item.skill_id} className={className}>{content}</span>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.06] pt-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

type Props = { skillId: string; onSelectSkill?: (id: string) => void; editable?: boolean };

function SkillDetailBody({ skillId, onSelectSkill, editable = false }: Props) {
  const { refresh } = useIntelligence();
  const [detail, setDetail] = useState<SkillDetailData | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch<SkillDetailData>(`/api/student/skills/${encodeURIComponent(skillId)}`)
      .then((next) => { if (active) { setDetail(next); setError(''); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, 'Could not load this skill.')); });
    return () => { active = false; };
  }, [skillId, reloadKey]);

  if (error && !detail) return <InlineAlert message={error} />;
  if (!detail) return <LoadingState compact label="Loading skill…" />;

  const profile = detail.profile;
  const requirement = detail.target_requirement;
  const shownLevel = level ?? profile?.proficiency ?? 0;

  const saveLevel = async () => {
    setSaving(true);
    setActionError('');
    try {
      setDetail(await apiFetch<SkillDetailData>(`/api/student/skills/${encodeURIComponent(skillId)}`, { method: 'PUT', body: { proficiency: shownLevel } }));
      setLevel(null);
      await refresh();
    } catch (cause) {
      setActionError(errorMessage(cause, 'Could not save your level.'));
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async () => {
    if (!window.confirm(`Remove ${detail.skill_name} from your skill profile?`)) return;
    setSaving(true);
    setActionError('');
    try {
      await apiFetch(`/api/student/skills/${encodeURIComponent(skillId)}`, { method: 'DELETE' });
      setLevel(null);
      setReloadKey((key) => key + 1);
      await refresh();
    } catch (cause) {
      setActionError(errorMessage(cause, 'Could not remove this skill.'));
    } finally {
      setSaving(false);
    }
  };

  const status = requirement
    ? requirement.current_level >= requirement.required_level * 0.8 ? 'strong' : requirement.current_level >= requirement.required_level * 0.4 ? 'developing' : 'critical'
    : 'owned';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{formatCategory(detail.category)}</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-50">{detail.skill_name}</h3>
        {detail.demand_weight != null ? <p className="mt-1 text-xs text-slate-500">Market demand weight {Math.round(detail.demand_weight * 100)}% (SkillVeda taxonomy)</p> : null}
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-md border border-white/[0.07] p-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Current</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{profile ? `${profile.proficiency}%` : '0%'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Required</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{requirement ? `${requirement.required_level}%` : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Gap</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{requirement ? requirement.gap : '—'}</p>
        </div>
        <div className="col-span-3">
          <LevelBar current={profile?.proficiency ?? 0} required={requirement?.required_level} status={status} />
        </div>
      </div>

      {profile ? (
        <div className="text-xs leading-5 text-slate-400">
          <p>
            <span className="text-slate-200">{confidenceText(profile.confidence_label)}</span>
            {' · '}
            {profile.source === 'self_assessed' ? 'Level set by you' : 'Estimated by the SkillVeda NLP'}
            {profile.source === 'self_assessed' && profile.nlp_proficiency != null ? `, NLP estimate ${profile.nlp_proficiency}%` : ''}
          </p>
          {profile.evidence ? <blockquote className="mt-2 border-l-2 border-white/10 pl-3 italic text-slate-400">“{profile.evidence}”</blockquote> : null}
        </div>
      ) : (
        <p className="text-xs text-slate-400">This skill is not in your profile yet.</p>
      )}

      {requirement ? (
        <Section title={`Why it matters for ${requirement.role_title}`}>
          <p className="text-sm leading-6 text-slate-300">{requirement.reason}</p>
          <p className="mt-2 text-xs text-slate-500">Importance: {requirement.importance}</p>
        </Section>
      ) : null}

      <AskAI skillId={detail.skill_id} />

      <Section title="Prerequisites"><SkillChips items={detail.prerequisites} onSelect={onSelectSkill} empty="No prerequisites." /></Section>
      <Section title="Unlocks"><SkillChips items={detail.unlocks} onSelect={onSelectSkill} empty="Not a prerequisite for other skills." /></Section>
      <Section title="Related skills"><SkillChips items={detail.related} onSelect={onSelectSkill} /></Section>

      <Section title="Roles that require it">
        {detail.required_by_roles.length ? (
          <ul className="flex flex-col gap-1 text-sm text-slate-300">
            {detail.required_by_roles.slice(0, 6).map((role) => (
              <li key={role.role_id} className="flex justify-between gap-3"><span>{role.role_title}</span><span className="tabular-nums text-slate-500">{role.required_proficiency}%</span></li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-500">No role in the taxonomy lists it as required.</p>}
      </Section>

      <Section title="Roadmap">
        <p className="mb-3 text-xs text-slate-400">
          {detail.in_roadmap ? 'This skill is a step in your current roadmap.' : requirement ? 'You already meet the strong threshold for your target role.' : 'Not required by your target role.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {detail.in_roadmap ? <Link href={`/dashboard/roadmap?skill=${detail.skill_id}`} className={buttonClass('secondary', 'text-xs')}>View roadmap step</Link> : null}
          <Link href={`/dashboard/courses?skill=${detail.skill_id}`} className={buttonClass('secondary', 'text-xs')}>Find courses</Link>
        </div>
      </Section>

      {editable ? (
        <Section title="Adjust your level">
          <p className="mb-3 text-xs leading-5 text-slate-400">If the NLP estimate looks wrong, set your own level. The original estimate is kept.</p>
          <div className="flex items-center gap-3">
            <label htmlFor={`level-${skillId}`} className="sr-only">Proficiency for {detail.skill_name}</label>
            <input id={`level-${skillId}`} type="range" min={0} max={100} step={5} value={shownLevel} onChange={(event) => setLevel(Number(event.target.value))} className="flex-1 accent-emerald-500" />
            <span className="w-10 text-right text-sm tabular-nums text-slate-200">{shownLevel}%</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveLevel()} disabled={saving || level === null} className={buttonClass('primary', 'text-xs')}>{profile ? 'Save level' : 'Add to my skills'}</button>
            {profile ? <button type="button" onClick={() => void removeSkill()} disabled={saving} className={buttonClass('ghost', 'text-xs text-rose-300 hover:text-rose-200')}>Remove from profile</button> : null}
          </div>
          {actionError ? <div className="mt-2"><InlineAlert message={actionError} /></div> : null}
        </Section>
      ) : null}
    </div>
  );
}

/** Keyed by skill so local edit state resets when another skill is opened. */
export function SkillDetail(props: Props) {
  return <SkillDetailBody key={props.skillId} {...props} />;
}

export function SkillDrawer({ skillId, onClose, onSelectSkill, editable }: { skillId: string | null; onClose: () => void; onSelectSkill?: (id: string) => void; editable?: boolean }) {
  return (
    <Drawer open={Boolean(skillId)} onClose={onClose} title="Skill details">
      {skillId ? <SkillDetail skillId={skillId} onSelectSkill={onSelectSkill} editable={editable} /> : null}
    </Drawer>
  );
}
