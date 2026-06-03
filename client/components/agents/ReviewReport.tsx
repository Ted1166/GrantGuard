'use client'

import type { ReviewResult } from '@/types/agent'

interface Props {
  result: ReviewResult
  isLoading?: boolean
}

export function ReviewReport({ result, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-[var(--accent2)]/30 bg-[var(--accent2)]/5">
        <div className="flex items-center gap-2 text-sm text-[var(--accent2)]">
          <div className="w-4 h-4 border-2 border-[var(--accent2)] border-t-transparent rounded-full animate-spin" />
          Venice AI reviewing submission…
        </div>
      </div>
    )
  }

  const scoreColor =
    result.score >= 80 ? 'var(--accent)' :
    result.score >= 50 ? 'var(--warn)' :
    'var(--danger)'

  return (
    <div className={`p-4 rounded-xl border ${
      result.approved
        ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
        : 'border-[var(--danger)]/30 bg-[var(--danger)]/5'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] font-medium"
            style={{ color: result.approved ? 'var(--accent)' : 'var(--danger)' }}>
            Venice AI Review
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border"
            style={{
              color: result.approved ? 'var(--accent)' : 'var(--danger)',
              borderColor: result.approved ? 'var(--accent)' : 'var(--danger)',
            }}>
            {result.approved ? 'Approved' : 'Rejected'}
          </span>
        </div>

        {/* Score gauge */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${result.score}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
          <span className="text-xs font-bold mono" style={{ color: scoreColor }}>
            {result.score}/100
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed mb-3">{result.summary}</p>

      {/* GitHub data if available */}
      {result.githubData && (
        <div className="flex gap-4 text-xs text-[var(--text-muted)] mb-3 p-2 rounded-lg bg-[var(--bg-hover)]">
          <span>📦 {result.githubData.commits} commits</span>
          <span>🔀 {result.githubData.prsmerged} PRs merged</span>
          <span>🕐 Last: {result.githubData.lastActivity}</span>
        </div>
      )}

      {/* Reasoning (collapsible) */}
      <details className="group">
        <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] transition-colors list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Full reasoning
        </summary>
        <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
          {result.reasoning}
        </p>
      </details>

      {/* Privacy note */}
      <p className="mt-2 text-[10px] text-[var(--text-muted)] opacity-60">
        🔒 Reasoning processed privately via Venice AI — not stored by any third party
      </p>
    </div>
  )
}