'use client';

import React, { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { AIAnswer } from '@/lib/types';
import { buttonClass } from './ui';

export function AnswerSource({ answer }: { answer: AIAnswer }) {
  const text = answer.llm_used
    ? `AI explanation (${answer.model ?? answer.provider}) from your SkillVeda data${answer.cached ? ' · saved' : ''}`
    : 'SkillVeda engine explanation (AI assistant not used)';
  return <p className="mt-2 text-[11px] text-slate-500">{text}</p>;
}

/** On-demand explanation. The LLM is only called when the student asks. */
export default function AskAI({ skillId, topic = 'gap', label = 'Explain with AI', intro }: {
  skillId?: string;
  topic?: 'gap' | 'roadmap' | 'readiness';
  label?: string;
  intro?: string;
}) {
  const [answer, setAnswer] = useState<AIAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async () => {
    setLoading(true);
    setError('');
    try {
      setAnswer(await apiFetch<AIAnswer>('/api/ai/explain', { method: 'POST', body: { skill_id: skillId ?? null, topic }, timeoutMs: 30000 }));
    } catch (cause) {
      setError(errorMessage(cause, 'Could not get an explanation.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-violet-400/15 bg-violet-400/[0.03] p-4">
      {answer ? (
        <>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{answer.answer}</p>
          <AnswerSource answer={answer} />
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400">{intro ?? 'Get a plain-language explanation built from your skill levels, gaps and roadmap.'}</p>
          <button type="button" onClick={() => void ask()} disabled={loading} className={buttonClass('secondary', 'shrink-0 text-xs')}>
            {loading ? 'Explaining…' : label}
          </button>
        </div>
      )}
      {error ? <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
