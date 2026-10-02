'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Intelligence } from '@/lib/types';

type IntelligenceValue = {
  data: Intelligence | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  replace: (next: Intelligence) => void;
};

const IntelligenceContext = createContext<IntelligenceValue | null>(null);

/**
 * One copy of the student's computed state for the whole dashboard. Pages read
 * it instead of recomputing readiness or gaps; mutations refresh or replace it.
 */
export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const next = await apiFetch<Intelligence>('/api/student/intelligence');
      setData(next);
      setError('');
    } catch (cause) {
      setError(errorMessage(cause, 'Could not load your SkillVeda profile.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<Intelligence>('/api/student/intelligence')
      .then((next) => { if (active) { setData(next); setError(''); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, 'Could not load your SkillVeda profile.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const replace = useCallback((next: Intelligence) => {
    setData(next);
    setError('');
  }, []);

  const value = useMemo(() => ({ data, loading, error, refresh, replace }), [data, loading, error, refresh, replace]);
  return <IntelligenceContext.Provider value={value}>{children}</IntelligenceContext.Provider>;
}

export function useIntelligence(): IntelligenceValue {
  const value = useContext(IntelligenceContext);
  if (!value) throw new Error('useIntelligence must be used inside IntelligenceProvider');
  return value;
}
