'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { CatalogMeta, Course, CourseGroup } from '@/lib/types';
import { Card, CardTitle, DemoNotice, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';

type CoursesResponse = {
  target_role: { id: string; title: string } | null;
  has_skills: boolean;
  catalog: CatalogMeta;
  recommendations: CourseGroup[];
  all_courses: Course[];
};

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-100 hover:text-primary">{course.title}</a>
          <p className="mt-1 text-xs text-slate-400">{course.provider} · {course.level} · {course.duration_weeks} wk{course.cost ? ` · ${course.cost}` : ''}</p>
        </div>
      </div>
      {course.description && <p className="mt-2 text-xs leading-5 text-slate-400">{course.description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {course.skills_taught.map((s) => (
          <span key={s.skill_id} className="rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">{s.skill_name}</span>
        ))}
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const [data, setData] = useState<CoursesResponse | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [skillFilter] = useState(() => (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('skill') ?? ''));
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<CoursesResponse>('/api/student/courses')
      .then((next) => { if (active) { setData(next); setError(''); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, 'Could not load courses.')); });
    return () => { active = false; };
  }, [reload]);

  const groups = useMemo(() => {
    const list = data?.recommendations ?? [];
    return skillFilter ? list.filter((g) => g.skill_id === skillFilter) : list;
  }, [data, skillFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data?.all_courses ?? [];
    if (!q) return list;
    return list.filter((c) => c.title.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q) || c.skills_taught.some((s) => s.skill_name.toLowerCase().includes(q)));
  }, [data, query]);

  if (error) return <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />;
  if (!data) return <LoadingState label="Loading courses…" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Learn" title="Courses" description={data.target_role ? `Matched to your gaps for ${data.target_role.title}.` : 'Pick a target role to get gap-matched courses.'} />
      {data.catalog.is_demo && <DemoNotice note={data.catalog.note ?? 'This course catalog is seeded demo data, not a live feed.'} />}

      <Card>
        <CardTitle>Recommended for your gaps</CardTitle>
        {!data.target_role || !data.has_skills ? (
          <EmptyState title="No recommendations yet" detail="Add skills and choose a target role to see courses for your gaps." href="/dashboard/resume" cta="Analyze resume" />
        ) : groups.length === 0 ? (
          <EmptyState title="No open gaps" detail="You meet every requirement for this role." />
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.skill_id}>
                <p className="mb-2 text-sm text-slate-200">{g.skill_name} <span className="text-xs text-slate-500">· level {g.current_level} → {g.target_level} · {g.priority} priority · suggested {g.suggested_level}</span></p>
                {g.courses.length ? (
                  <div className="grid gap-3 md:grid-cols-2">{g.courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
                ) : <p className="text-xs text-slate-500">No catalog course covers this skill yet.</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>All courses</CardTitle>
        <label className="mb-4 block">
          <span className="sr-only">Search courses</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, provider or skill" className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none" />
        </label>
        <p className="mb-3 text-xs text-slate-500">{filtered.length} courses{query ? '' : ` across ${new Set(filtered.flatMap((c) => c.skills_taught.map((s) => s.skill_id))).size} skills`}</p>
        <div className="grid gap-3 md:grid-cols-2">{filtered.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        {!filtered.length && <p className="text-xs text-slate-500">No courses match “{query}”.</p>}
      </Card>
    </div>
  );
}
