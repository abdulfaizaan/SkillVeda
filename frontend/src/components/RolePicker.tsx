'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Intelligence, Role } from '@/lib/types';
import { useIntelligence } from '@/lib/use-intelligence';

/** Changing the role recomputes gaps, roadmap, courses and jobs on the backend. */
export default function RolePicker({ id = 'target-role' }: { id?: string }) {
  const { data, replace } = useIntelligence();
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch<{ roles: Role[] }>('/api/student/roles')
      .then((response) => { if (active) setRoles(response.roles); })
      .catch(() => { if (active) setError('Could not load roles.'); });
    return () => { active = false; };
  }, []);

  const change = async (roleId: string) => {
    setSaving(true);
    setError('');
    try {
      replace(await apiFetch<Intelligence>('/api/student/target-role', { method: 'POST', body: { role_id: roleId || null } }));
    } catch (cause) {
      setError(errorMessage(cause, 'Could not change the target role.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-[220px] flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Target career</label>
      <select
        id={id}
        value={data?.target_role?.id ?? ''}
        onChange={(event) => void change(event.target.value)}
        disabled={saving || !roles.length}
        className="rounded-md border border-white/10 bg-[#0a1020] px-3 py-2 text-sm text-slate-100 focus:border-primary/50 focus:outline-none disabled:opacity-60 [&>option]:bg-[#0a1020]"
      >
        <option value="">Choose a role…</option>
        {roles.map((role) => <option key={role.id} value={role.id}>{role.title}</option>)}
      </select>
      {saving ? <span role="status" className="text-xs text-slate-500">Recomputing your analysis…</span> : null}
      {error ? <span role="alert" className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
