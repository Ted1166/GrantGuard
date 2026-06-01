'use client'

import { MilestoneStatus } from '@/types/grant'

interface AgentStep {
  label: string
  agent: string
  status: 'idle' | 'running' | 'done' | 'failed'
  detail?: string
}

interface Props {
  milestoneStatus: MilestoneStatus
  reviewSummary?: string
  txHash?: string
  auditSummary?: string
}

export function AgentStatusPanel({ milestoneStatus, reviewSummary, txHash, auditSummary }: Props) {
  const steps: AgentStep[] = [
    {
      label: 'Evidence Review',
      agent: 'Reviewer Agent (Venice AI)',
      status:
        milestoneStatus === MilestoneStatus.PENDING ? 'idle'
        : milestoneStatus === MilestoneStatus.UNDER_REVIEW ? 'running'
        : milestoneStatus >= MilestoneStatus.APPROVED ? 'done'
        : milestoneStatus === MilestoneStatus.REJECTED ? 'failed'
        : 'idle',
      detail: reviewSummary,
    },
    {
      label: 'USDC Distribution',
      agent: 'Distributor Agent (1Shot Relayer)',
      status:
        milestoneStatus < MilestoneStatus.APPROVED ? 'idle'
        : milestoneStatus === MilestoneStatus.APPROVED ? 'running'
        : milestoneStatus === MilestoneStatus.PAID ? 'done'
        : 'idle',
      detail: txHash ? `Tx: ${txHash.slice(0, 10)}…${txHash.slice(-6)}` : undefined,
    },
    {
      label: 'Audit & Verification',
      agent: 'Auditor Agent (Venice AI)',
      status:
        milestoneStatus < MilestoneStatus.PAID ? 'idle'
        : auditSummary ? 'done'
        : 'running',
      detail: auditSummary,
    },
  ]

  return (
    <div className="agent-border rounded-xl p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--accent2)] font-medium">
        Agent Pipeline
      </h3>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div className={`
                w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0
                ${step.status === 'done'    ? 'border-[var(--accent)]  bg-[var(--accent)]/10  text-[var(--accent)]'  : ''}
                ${step.status === 'running' ? 'border-[var(--accent2)] bg-[var(--accent2)]/10 text-[var(--accent2)] status-pulse' : ''}
                ${step.status === 'failed'  ? 'border-[var(--danger)]  bg-[var(--danger)]/10  text-[var(--danger)]'  : ''}
                ${step.status === 'idle'    ? 'border-[var(--border)]  bg-transparent          text-[var(--text-muted)]' : ''}
              `}>
                {step.status === 'done' ? '✓' : step.status === 'failed' ? '✗' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-px h-full mt-1 min-h-[12px] ${
                  step.status === 'done' ? 'bg-[var(--accent)]/30' : 'bg-[var(--border)]'
                }`} />
              )}
            </div>

            {/* Step content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium">{step.label}</span>
                <span className="text-xs text-[var(--text-muted)] mono">{step.agent}</span>
              </div>
              {step.detail && (
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}