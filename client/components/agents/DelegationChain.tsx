'use client'

import { MilestoneStatus } from '@/types/grant'

interface Props {
  committeeAddress?: string
  reviewerAddress?: string
  distributorAddress?: string
  auditorAddress?: string
  milestoneStatus: MilestoneStatus
  milestoneId?: string
  capAmount?: string
}

interface ChainNode {
  role: string
  label: string
  address?: string
  description: string
  active: boolean
  done: boolean
  color: string
}

export function DelegationChain({
  committeeAddress,
  reviewerAddress,
  distributorAddress,
  auditorAddress,
  milestoneStatus,
  milestoneId,
  capAmount,
}: Props) {
  const nodes: ChainNode[] = [
    {
      role: 'ROOT',
      label: 'Committee',
      address: committeeAddress,
      description: 'Smart account — holds funds, signs root delegation',
      active: true,
      done: true,
      color: '#818cf8',
    },
    {
      role: 'DELEGATE',
      label: 'Reviewer Agent',
      address: reviewerAddress,
      description: 'Venice AI — reads evidence, never executes',
      active: milestoneStatus >= MilestoneStatus.UNDER_REVIEW,
      done: milestoneStatus >= MilestoneStatus.APPROVED || milestoneStatus === MilestoneStatus.REJECTED,
      color: '#6ee7b7',
    },
    {
      role: 'REDELEGATE',
      label: 'Distributor Agent',
      address: distributorAddress,
      description: `MilestoneCapEnforcer — max ${capAmount ?? '?'} USDC`,
      active: milestoneStatus >= MilestoneStatus.APPROVED,
      done: milestoneStatus === MilestoneStatus.PAID,
      color: '#fbbf24',
    },
    {
      role: 'REDELEGATE',
      label: 'Auditor Agent',
      address: auditorAddress ?? reviewerAddress,
      description: 'Venice AI — read-only tx verification',
      active: milestoneStatus === MilestoneStatus.PAID,
      done: milestoneStatus === MilestoneStatus.PAID,
      color: '#818cf8',
    },
  ]

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
          Delegation Chain
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent2)]/10 text-[var(--accent2)]">
          ERC-7710
        </span>
      </div>

      <div className="space-y-0">
        {nodes.map((node, i) => (
          <div key={i} className="flex gap-3">
            {/* Left: connector line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all duration-500"
                style={{
                  borderColor: node.active ? node.color : 'var(--border)',
                  backgroundColor: node.done
                    ? node.color + '20'
                    : node.active
                    ? node.color + '10'
                    : 'transparent',
                  color: node.active ? node.color : 'var(--text-muted)',
                }}
              >
                {node.done ? '✓' : i + 1}
              </div>
              {i < nodes.length - 1 && (
                <div className="flex flex-col items-center my-1">
                  {/* Arrow line */}
                  <div
                    className="w-px transition-all duration-500"
                    style={{
                      height: '16px',
                      backgroundColor: node.done ? node.color + '60' : 'var(--border)',
                    }}
                  />
                  {/* Arrow label */}
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded border my-0.5 transition-all duration-500"
                    style={{
                      borderColor: node.done ? node.color + '40' : 'var(--border)',
                      color: node.done ? node.color : 'var(--text-muted)',
                      backgroundColor: node.done ? node.color + '10' : 'transparent',
                    }}
                  >
                    {i === 0 ? 'delegate' : 'redelegate'}
                  </span>
                  <div
                    className="w-px transition-all duration-500"
                    style={{
                      height: '16px',
                      backgroundColor: node.done ? node.color + '60' : 'var(--border)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Right: content */}
            <div className={`pb-1 flex-1 min-w-0 ${i < nodes.length - 1 ? '' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span
                  className="text-sm font-semibold transition-colors duration-500"
                  style={{ color: node.active ? node.color : 'var(--text-muted)' }}
                >
                  {node.label}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {node.role}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{node.description}</p>
              {node.address && (
                <p className="text-[10px] mono text-[var(--text-muted)] mt-0.5 opacity-60">
                  {node.address.slice(0, 10)}…{node.address.slice(-6)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Caveat enforcer callout */}
      {milestoneId && (
        <div className="mt-4 p-3 rounded-lg border border-[var(--warn)]/20 bg-[var(--warn)]/5">
          <p className="text-xs font-medium text-[var(--warn)] mb-1">
            MilestoneCapEnforcer active
          </p>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            The Distributor Agent is cryptographically incapable of paying more than{' '}
            <span className="text-[var(--warn)]">{capAmount ?? '?'} USDC</span> for milestone{' '}
            <span className="mono">{milestoneId.slice(0, 12)}…</span>
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Enforcer:{' '}
            <a
              href={`https://sepolia.basescan.org/address/${process.env.NEXT_PUBLIC_CAP_ENFORCER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent2)] hover:underline mono"
            >
              {(process.env.NEXT_PUBLIC_CAP_ENFORCER ?? '0x2CA428…').slice(0, 12)}… ↗
            </a>
          </p>
        </div>
      )}
    </div>
  )
}