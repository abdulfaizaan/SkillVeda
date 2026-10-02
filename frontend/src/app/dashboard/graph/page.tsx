'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { GraphNode, StudentGraph } from '@/lib/types';
import { SkillDrawer } from '@/components/SkillDetail';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, STATUS_META, cx, formatCategory } from '@/components/ui';

const WIDTH = 900;
const HEIGHT = 640;
const STATUS_COLORS: Record<string, string> = { strong: '#34d399', developing: '#fbbf24', critical: '#fb7185', owned: '#38bdf8', context: '#64748b' };

function layout(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  // Deterministic radial layout: role at centre, skills grouped by domain around it.
  const pos = new Map<string, { x: number; y: number }>();
  const cx0 = WIDTH / 2;
  const cy0 = HEIGHT / 2;
  const roles = nodes.filter((n) => n.kind === 'role');
  roles.forEach((r, i) => pos.set(r.id, { x: cx0 + i * 40, y: cy0 }));
  const skills = nodes.filter((n) => n.kind === 'skill').sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  const inner = skills.filter((n) => n.membership === 'required');
  const outer = skills.filter((n) => n.membership !== 'required');
  const ring = (list: GraphNode[], radius: number) => list.forEach((n, i) => {
    const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2;
    pos.set(n.id, { x: cx0 + Math.cos(angle) * radius * 1.3, y: cy0 + Math.sin(angle) * radius });
  });
  ring(inner, outer.length ? 170 : 230);
  ring(outer, 280);
  return pos;
}

export default function GraphPage() {
  const [graph, setGraph] = useState<StudentGraph | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return '';
    const focus = window.sessionStorage.getItem('skillveda_graph_focus') ?? '';
    window.sessionStorage.removeItem('skillveda_graph_focus');
    return focus;
  });
  const [domain, setDomain] = useState('all');
  const [status, setStatus] = useState('all');
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<StudentGraph>('/api/student/skill-graph')
      .then((next) => { if (active) { setGraph(next); setError(''); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, 'Could not load your skill graph.')); });
    return () => { active = false; };
  }, [reload]);

  const positions = useMemo(() => layout(graph?.nodes ?? []), [graph]);

  const visible = useMemo(() => {
    const set = new Set<string>();
    for (const n of graph?.nodes ?? []) {
      if (n.kind === 'role') { set.add(n.id); continue; }
      if (domain !== 'all' && n.category !== domain) continue;
      if (status !== 'all' && n.status !== status) continue;
      set.add(n.id);
    }
    return set;
  }, [graph, domain, status]);

  const neighbours = useMemo(() => {
    if (!hover || !graph) return null;
    const set = new Set([hover]);
    graph.edges.forEach((e) => { if (e.source === hover) set.add(e.target); if (e.target === hover) set.add(e.source); });
    return set;
  }, [hover, graph]);

  const q = search.trim().toLowerCase();
  const matches = (n: GraphNode) => q !== '' && (n.label.toLowerCase().includes(q) || n.id.toLowerCase() === q);

  if (error) return <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />;
  if (!graph) return <LoadingState label="Building your skill graph…" />;

  const onWheel = (e: React.WheelEvent) => {
    const k = Math.max(0.4, Math.min(3, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    setView((v) => ({ ...v, k }));
  };
  const zoom = (factor: number) => setView((v) => ({ ...v, k: Math.max(0.4, Math.min(3, v.k * factor)) }));

  const selectClass = 'rounded-md border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-slate-200 focus:border-primary focus:outline-none';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Explore" title="Skill graph" description={graph.role ? `How your skills connect to ${graph.role.title}. Click a skill for details.` : 'Your skills and how they connect. Pick a target role to see requirements.'} />
      {!graph.nodes.length ? (
        <EmptyState title="Nothing to show yet" detail="Add skills or choose a target role to build your graph." href="/dashboard/resume" cta="Analyze resume" />
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex-1 min-w-[180px]">
              <span className="sr-only">Search skills</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills" className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none" />
            </label>
            <label><span className="sr-only">Domain</span>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClass}>
                <option value="all">All domains</option>
                {graph.domains.map((d) => <option key={d} value={d}>{formatCategory(d)}</option>)}
              </select>
            </label>
            <label><span className="sr-only">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                <option value="all">All statuses</option>
                {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <div className="flex gap-1">
              <button type="button" aria-label="Zoom in" onClick={() => zoom(1.2)} className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.04]">+</button>
              <button type="button" aria-label="Zoom out" onClick={() => zoom(0.8)} className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.04]">−</button>
              <button type="button" onClick={() => setView({ x: 0, y: 0, k: 1 })} className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]">Reset</button>
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-white/5 bg-[#060b14]">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-[560px] w-full cursor-grab touch-none active:cursor-grabbing"
              role="img"
              aria-label="Skill graph"
              onWheel={onWheel}
              onPointerDown={(e) => { drag.current = { x: e.clientX - view.x, y: e.clientY - view.y }; }}
              onPointerMove={(e) => { if (drag.current) { const start = drag.current; setView((v) => ({ ...v, x: e.clientX - start.x, y: e.clientY - start.y })); } }}
              onPointerUp={() => { drag.current = null; }}
              onPointerLeave={() => { drag.current = null; }}
            >
              <g transform={`translate(${view.x} ${view.y}) translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${view.k}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`}>
                {graph.edges.map((e, i) => {
                  const a = positions.get(e.source);
                  const b = positions.get(e.target);
                  if (!a || !b || !visible.has(e.source) || !visible.has(e.target)) return null;
                  const lit = neighbours ? neighbours.has(e.source) && neighbours.has(e.target) : true;
                  return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.type === 'requires' ? '#334155' : e.type === 'prerequisite' ? '#a78bfa' : '#1e293b'} strokeDasharray={e.type === 'related' ? '3 4' : undefined} strokeWidth={e.type === 'prerequisite' ? 1.4 : 1} opacity={lit ? 0.9 : 0.12} />;
                })}
                {graph.nodes.map((n) => {
                  const p = positions.get(n.id);
                  if (!p || !visible.has(n.id)) return null;
                  const isRole = n.kind === 'role';
                  const color = isRole ? '#10b981' : STATUS_COLORS[n.status ?? 'context'] ?? '#64748b';
                  const dim = neighbours ? !neighbours.has(n.id) : q !== '' && !matches(n);
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${p.x} ${p.y})`}
                      opacity={dim ? 0.2 : 1}
                      className="cursor-pointer"
                      onPointerEnter={() => setHover(n.id)}
                      onPointerLeave={() => setHover(null)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => { if (!isRole) setSelected(n.id); }}
                    >
                      <title>{isRole ? n.label : `${n.label} — ${STATUS_META[(n.status ?? 'context') as keyof typeof STATUS_META]?.label ?? ''}${n.current_level != null ? `, level ${n.current_level}` : ''}${n.required_level != null ? ` / ${n.required_level}` : ''}`}</title>
                      <circle r={isRole ? 26 : 9} fill={isRole ? '#052e1f' : '#0b1220'} stroke={color} strokeWidth={matches(n) ? 4 : 2} />
                      <text y={isRole ? 44 : 22} textAnchor="middle" className={cx('select-none', isRole ? 'fill-emerald-200 text-[13px] font-semibold' : 'fill-slate-300 text-[10px]')}>{n.label}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
            {Object.entries(STATUS_META).map(([key, meta]) => <span key={key} className="flex items-center gap-1.5"><span className={cx('h-2 w-2 rounded-full', meta.dot)} />{meta.label}</span>)}
            <span className="flex items-center gap-1.5"><span className="h-px w-4 bg-violet-400" />Prerequisite</span>
            <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t border-dashed border-slate-500" />Related</span>
          </div>
        </Card>
      )}
      <SkillDrawer skillId={selected} onClose={() => setSelected(null)} onSelectSkill={setSelected} editable />
    </div>
  );
}
