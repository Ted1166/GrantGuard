'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { useAccount } from 'wagmi'
import type { GrantRecord, MilestoneRecord } from '@/types/grant'
import { MilestoneStatus } from '@/types/grant'

interface GrantWithMilestones extends GrantRecord {
  milestones: MilestoneRecord[]
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  [MilestoneStatus.NONE]: { label: 'None', color: 'text-[var(--text-muted)]' },
  [MilestoneStatus.PENDING]: { label: 'Pending', color: 'text-[var(--warn)]' },
  [MilestoneStatus.UNDER_REVIEW]: { label: 'Under Review', color: 'text-[var(--accent2)]' },
  [MilestoneStatus.APPROVED]: { label: 'Approved', color: 'text-[var(--accent)]' },
  [MilestoneStatus.PAID]: { label: 'Paid', color: 'text-[var(--accent)]' },
  [MilestoneStatus.REJECTED]: { label: 'Rejected', color: 'text-[var(--danger)]' },
}

function formatUsdc(amount: string): string {
  try {
    return `$${(Number(amount) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  } catch { return '$0.00' }
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [grants, setGrants] = useState<GrantWithMilestones[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/grants')
      .then((r) => r.json())
      .then((data) => { setGrants(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 4 L92 24 L92 72 Q92 100 50 116 Q8 100 8 72 L8 24 Z" fill="#1a1a2e" stroke="#6366f1" strokeWidth="3"/>
                <path d="M62 35 A22 22 0 1 0 70 68 L50 68 L50 56 L62 56" stroke="#6ee7b7" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <circle cx="82" cy="32" r="4" fill="#6ee7b7" opacity="0.9"/>
              </svg>
            <span className="font-bold text-sm tracking-tight">GrantGuard</span>
          </Link>
          <span className="text-[var(--border-hi)]">/</span>
          <span className="text-sm text-[var(--text-muted)]">Dashboard</span>
        </div>
        <ConnectButton />
      </nav>

      <div className="flex-1 px-8 py-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grant Programs</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {grants.length} active grant{grants.length !== 1 ? 's' : ''} · Base Sepolia
            </p>
          </div>
          {isConnected && (
            <Link
              href="/grants/new"
              className="px-4 py-2 rounded-lg bg-[var(--accent2)] text-[#0a0a0f]
                         font-semibold text-sm hover:bg-[var(--accent2)]/90 transition-colors"
            >
              + New Grant
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Total Grants',
              value: grants.length.toString(),
            },
            {
              label: 'Total Milestones',
              value: grants.reduce((s, g) => s + g.milestones.length, 0).toString(),
            },
            {
              label: 'Total Budget',
              value: formatUsdc(
                grants.reduce((s, g) => s + Number(g.totalBudget), 0).toString()
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold mono">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Grants list */}
        {loading ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <div className="w-6 h-6 border-2 border-[var(--accent2)] border-t-transparent
                            rounded-full animate-spin mx-auto mb-3" />
            Loading grants…
          </div>
        ) : grants.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--border)]
                          rounded-xl text-[var(--text-muted)]">
            <p className="text-4xl mb-4">🏛️</p>
            <p className="font-medium mb-1">No grants yet</p>
            <p className="text-sm">Create the first grant program to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grants.map((grant) => {
              const paid = grant.milestones.filter((m) => m.status === MilestoneStatus.PAID).length
              const total = grant.milestones.length
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0

              return (
                <Link
                  key={grant.id}
                  href={`/grants/${grant.id}`}
                  className="block p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]
                             hover:border-[var(--border-hi)] hover:bg-[var(--bg-hover)]
                             transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold group-hover:text-[var(--accent2)] transition-colors">
                        {grant.title}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mono mt-1">
                        {grant.committee.slice(0, 8)}…{grant.committee.slice(-6)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold mono">{formatUsdc(grant.totalBudget)}</p>
                      <p className="text-xs text-[var(--text-muted)]">{total} milestones</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                        <span>{paid}/{total} milestones paid</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Milestone status chips */}
                  {grant.milestones.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {grant.milestones.slice(0, 5).map((m) => {
                        const s = STATUS_LABELS[m.status] ?? STATUS_LABELS[1]
                        return (
                          <span
                            key={m.id}
                            className={`text-[10px] px-2 py-0.5 rounded-full border border-current/20 ${s.color}`}
                          >
                            {s.label}
                          </span>
                        )
                      })}
                      {grant.milestones.length > 5 && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          +{grant.milestones.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}