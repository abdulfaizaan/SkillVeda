'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import type { AIAnswer, AIStatus } from '@/lib/types';
import { useIntelligence } from '@/lib/use-intelligence';
import { AnswerSource } from './AskAI';
import { buttonClass, Drawer } from './ui';

type Message = { question: string; answer?: AIAnswer; error?: string };

/** SkillVeda career assistant. Sends only a small structured context via the backend. */
export default function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useIntelligence();
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || status) return;
    let active = true;
    apiFetch<AIStatus>('/api/ai/status')
      .then((next) => { if (active) setStatus(next); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [open, status]);

  const suggestions = useMemo(() => {
    const list: Array<{ question: string; skillId?: string }> = [];
    const gap = data?.critical_gaps[0] ?? data?.developing_skills[0];
    if (gap) list.push({ question: `Why should I learn ${gap.skill_name}?`, skillId: gap.skill_id });
    if (data?.target_role) list.push({ question: `What should I focus on first to become a ${data.target_role.title}?` });
    const step = data?.roadmap?.steps.find((item) => item.status !== 'completed');
    if (step && step.skill_id !== gap?.skill_id) list.push({ question: `How should I approach learning ${step.skill_name}?`, skillId: step.skill_id });
    return list;
  }, [data]);

  const ask = async (text: string, skillId?: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || pending) return;
    setPending(true);
    setQuestion('');
    setMessages((current) => [...current, { question: trimmed }]);
    const update = (patch: Partial<Message>) =>
      setMessages((current) => current.map((item, index) => (index === current.length - 1 ? { ...item, ...patch } : item)));
    try {
      update({ answer: await apiFetch<AIAnswer>('/api/ai/career-question', { method: 'POST', body: { question: trimmed, skill_id: skillId ?? null }, timeoutMs: 30000 }) });
    } catch (cause) {
      update({ error: errorMessage(cause, 'The assistant could not answer.') });
    } finally {
      setPending(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Ask SkillVeda">
      <div className="flex h-full flex-col gap-4">
        <p className="text-xs leading-5 text-slate-400">
          Answers use your target role, skill levels, gaps and roadmap from SkillVeda. Scores are never changed by the assistant.
        </p>
        {status && !status.enabled ? (
          <p className="rounded-md border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-xs leading-5 text-amber-100/90">
            No AI provider is configured in the backend, so answers come from SkillVeda&apos;s built-in explanations. Free-form questions need an LLM set in <code className="text-amber-200">SkillVeda/.env</code>.
          </p>
        ) : null}

        <div className="flex flex-1 flex-col gap-4">
          {messages.map((message, index) => (
            <div key={index} className="flex flex-col gap-2">
              <p className="self-end rounded-md bg-white/[0.05] px-3 py-2 text-sm text-slate-100">{message.question}</p>
              {message.answer ? (
                <div className="rounded-md border border-white/[0.07] px-3 py-2">
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{message.answer.answer}</p>
                  <AnswerSource answer={message.answer} />
                </div>
              ) : message.error ? (
                <p role="alert" className="text-xs text-rose-300">{message.error}</p>
              ) : (
                <p role="status" className="text-xs text-slate-500">Thinking…</p>
              )}
            </div>
          ))}
          {!messages.length && suggestions.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Suggested</p>
              {suggestions.map((item) => (
                <button key={item.question} type="button" onClick={() => void ask(item.question, item.skillId)} className="rounded-md border border-white/[0.08] px-3 py-2 text-left text-sm text-slate-300 hover:border-white/20 hover:text-slate-100">
                  {item.question}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <form
          className="sticky bottom-0 flex flex-col gap-2 border-t border-white/[0.07] bg-[#060a15] pt-4"
          onSubmit={(event) => { event.preventDefault(); void ask(question); }}
        >
          <label htmlFor="assistant-question" className="sr-only">Your question</label>
          <textarea
            id="assistant-question"
            value={question}
            maxLength={500}
            rows={3}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(question); } }}
            placeholder="Ask about your gaps, roadmap or target role…"
            className="w-full resize-none rounded-md border border-white/10 bg-[#0a1020] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-primary/50 focus:outline-none"
          />
          <button type="submit" disabled={pending || question.trim().length < 3} className={buttonClass('primary')}>{pending ? 'Asking…' : 'Ask'}</button>
        </form>
      </div>
    </Drawer>
  );
}
