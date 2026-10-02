'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import { IntelligenceProvider, useIntelligence } from '@/lib/use-intelligence';
import AssistantPanel from '@/components/AssistantPanel';
import { cx } from '@/components/ui';

type SkillSearchResult = { id: string; label: string; category: string };
type NavItem = { name: string; href: string; icon: React.ReactNode };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Overview', items: [{ name: 'Overview', href: '/dashboard', icon: <HomeIcon /> }] },
  {
    label: 'My intelligence',
    items: [
      { name: 'My Skills', href: '/dashboard/skills', icon: <SkillsIcon /> },
      { name: 'Skill Graph', href: '/dashboard/graph', icon: <GraphIcon /> },
      { name: 'Skill Gap', href: '/dashboard/gap', icon: <GapIcon /> },
      { name: 'Career Roadmap', href: '/dashboard/roadmap', icon: <RoadmapIcon /> },
    ],
  },
  {
    label: 'Opportunities',
    items: [
      { name: 'Jobs', href: '/dashboard/jobs', icon: <JobsIcon /> },
      { name: 'Courses', href: '/dashboard/courses', icon: <CoursesIcon /> },
    ],
  },
  { label: 'Tools', items: [{ name: 'Resume Analyzer', href: '/dashboard/resume', icon: <ResumeIcon /> }] },
  {
    label: 'Account',
    items: [
      { name: 'Profile', href: '/dashboard/profile', icon: <ProfileIcon /> },
      { name: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <IntelligenceProvider>
      <DashboardShell>{children}</DashboardShell>
    </IntelligenceProvider>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/');
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="text-primary" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22C12 22 12 16 7 11C2 6 2 2 2 2C2 2 6 2 11 7C16 12 12 22 12 22ZM12 22C12 22 12 16 17 11C22 6 22 2 22 2C22 2 18 2 13 7C8 12 12 22 12 22ZM12 22C12 22 12 18 12 14" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-50">SkillVeda</span>
    </Link>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
                      active ? 'border-primary bg-primary/[0.07] font-medium text-slate-50' : 'border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-100',
                    )}
                  >
                    <span className={active ? 'text-primary' : 'text-slate-500'}>{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useIntelligence();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SkillSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);

  const studentName = data?.student.name.trim() || 'Student';
  const initials = studentName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(apiUrl('/api/skills/search?q=' + encodeURIComponent(query)), { signal: controller.signal });
        if (!response.ok) throw new Error('Skill search failed');
        const results = await response.json();
        if (active) setSearchResults(Array.isArray(results) ? results : []);
      } catch (error) {
        if (active && !(error instanceof Error && error.name === 'AbortError')) setSearchResults([]);
      }
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('dashboard-skill-search')?.focus();
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const openSkill = (skillId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push('/dashboard/graph?skill=' + encodeURIComponent(skillId));
  };

  return (
    <div className="flex min-h-screen bg-[#050914] text-slate-100">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[#060a15] md:flex">
        <div className="flex h-[68px] items-center border-b border-white/[0.06] px-5"><Brand /></div>
        <div className="flex-1 overflow-y-auto px-3 py-6"><SidebarNav pathname={pathname} /></div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-white/10 bg-[#060a15]">
            <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-5">
              <Brand />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="rounded p-1.5 text-slate-400 hover:bg-white/5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-6"><SidebarNav pathname={pathname} onNavigate={() => setMenuOpen(false)} /></div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-[#050914]/95 px-4 backdrop-blur md:h-[68px] md:gap-6 md:px-8">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="rounded-md p-2 text-slate-300 hover:bg-white/5 md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div className="relative min-w-0 max-w-xl flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="dashboard-skill-search"
              type="search"
              className="w-full rounded-md border border-white/10 bg-[#0a1020] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none md:pr-16"
              placeholder="Search skills…"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
              onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
              onKeyDown={(event) => { if (event.key === 'Enter' && searchResults[0]) openSkill(searchResults[0].id); }}
              aria-label="Search skills in the skill graph"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500 md:inline">Ctrl K</span>
            {searchOpen && searchQuery.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-white/10 bg-[#0a1020] shadow-2xl">
                {searchResults.length ? searchResults.map((skill) => (
                  <button key={skill.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openSkill(skill.id)} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-white/5">
                    <span className="text-sm text-slate-100">{skill.label}</span>
                    <span className="text-xs capitalize text-slate-500">{skill.category.replaceAll('_', ' ')}</span>
                  </button>
                )) : <div className="px-4 py-3 text-sm text-slate-400">No matching skills found.</div>}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <button type="button" onClick={() => setAssistantOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-violet-400/25 px-3 py-2 text-sm text-violet-100 hover:bg-violet-400/[0.06]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span className="hidden sm:inline">Ask SkillVeda</span>
            </button>
            <Link href="/dashboard/profile" className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-4" aria-label="Your profile">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0d1628] text-xs font-semibold text-slate-100">{initials || 'S'}</span>
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-medium leading-none text-slate-100">{studentName}</span>
                <span className="mt-1 block text-[11px] leading-none text-slate-500">{data?.target_role?.title ?? 'Student'}</span>
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <AssistantPanel open={assistantOpen} onClose={closeAssistant} />
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
function HomeIcon() { return <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>; }
function SkillsIcon() { return <Icon><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Icon>; }
function GraphIcon() { return <Icon><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Icon>; }
function GapIcon() { return <Icon><rect x="18" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="2" y="13" width="4" height="8" /></Icon>; }
function RoadmapIcon() { return <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>; }
function CoursesIcon() { return <Icon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Icon>; }
function JobsIcon() { return <Icon><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Icon>; }
function ResumeIcon() { return <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Icon>; }
function ProfileIcon() { return <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>; }
function SettingsIcon() { return <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>; }
