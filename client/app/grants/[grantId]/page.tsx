'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { ReviewReport } from '@/components/agents/ReviewReport'
import { TransactionStatus } from '@/components/agents/TransactionStatus'
import type { ReviewResult, DistributionResult } from '@/types/agent'
import { MilestoneSubmitForm } from '@/components/grants/MilestoneSubmitForm'
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel'
import { DelegationChain } from '@/components/agents/DelegationChain'
import { PermissionRequest } from '@/components/wallet/PermissionRequest'
import { MILESTONE_REGISTRY_ABI } from '@/lib/contracts/abis'
import { CONTRACTS, USDC_DECIMALS } from '@/config/constants'
import { MilestoneStatus, type MilestoneRecord, type GrantRecord } from '@/types/grant'

interface GrantDetail extends GrantRecord {
  milestones: MilestoneRecord[]
}

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  [MilestoneStatus.PENDING]:      { label: 'Pending',      color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  [MilestoneStatus.UNDER_REVIEW]: { label: 'Under Review', color: '#818cf8', bg: 'rgba(129,140,248,0.08)' },
  [MilestoneStatus.APPROVED]:     { label: 'Approved',     color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
  [MilestoneStatus.PAID]:         { label: 'Paid ✓',       color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)' },
  [MilestoneStatus.REJECTED]:     { label: 'Rejected',     color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
}

function formatUsdc(amount: string) {
  try { return `$${(Number(amount) / 1_000_000).toFixed(2)}` } catch { return '$0.00' }
}

export default function GrantDetailPage() {
  const { grantId } = useParams<{ grantId: string }>()
  const { address, isConnected } = useAccount()
  const [grant, setGrant] = useState<GrantDetail | null>(null)
  const [selected, setSelected] = useState<MilestoneRecord | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [permissionsCtx, setPermissionsCtx] = useState<unknown>(null)
  const [showChain, setShowChain] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [distResult, setDistResult] = useState<DistributionResult | null>(null)

  useEffect(() => {
    fetch(`/api/grants/${grantId}`)
      .then((r) => r.json())
      .then(setGrant)
  }, [grantId])

  const isCommittee = address?.toLowerCase() === grant?.committee.toLowerCase()

  async function refreshGrant(milestoneId?: string) {
    const updated = await fetch(`/api/grants/${grantId}`).then((r) => r.json())
    setGrant(updated)
    if (milestoneId) {
      setSelected(updated.milestones.find((m: MilestoneRecord) => m.id === milestoneId) ?? null)
    }
  }

  async function triggerReview(milestoneId: string) {
    setReviewing(true)
    setStatusMsg('Reviewer Agent analysing via Venice AI…')
    try {
      const res = await fetch('/api/agents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId }),
      })
      const data = await res.json()
      setStatusMsg(data.result?.summary ?? 'Review complete.')
      if (data.result) setReviewResult(data.result)
      await refreshGrant(milestoneId)
    } catch {
      setStatusMsg('Review failed — check console.')
    } finally {
      setReviewing(false)
    }
  }

  async function triggerDistribute(milestoneId: string) {
    setDistributing(true)
    setStatusMsg('Building A2A delegation chain… Distributor Agent executing via 1Shot…')
    try {
      const res = await fetch('/api/agents/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId, permissionsContext: permissionsCtx }),
      })
      const data = await res.json()
      if (data.error) {
        setStatusMsg(`Distribution failed: ${data.error}`)
      } else {
        if (data.result) setDistResult(data.result)
        setStatusMsg(
          data.result?.status === 'confirmed'
            ? `✓ Paid! Tx: ${data.result.txHash?.slice(0, 12)}…`
            : `Task submitted: ${data.result?.oneshotTaskId ?? 'pending'}`
        )
        await refreshGrant(milestoneId)
      }
    } catch (err) {
      setStatusMsg(`Distribution error: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setDistributing(false)
    }
  }

  if (!grant) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent2)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="font-bold tracking-tight">GrantGuard</Link>
          <span className="text-[var(--border-hi)]">/</span>
          <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">Dashboard</Link>
          <span className="text-[var(--border-hi)]">/</span>
          <span className="truncate max-w-[200px]">{grant.title}</span>
        </div>
        <ConnectButton />
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full px-8 py-8 gap-8">

        {/* Left — milestone list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold">{grant.title}</h1>
              <p className="text-xs mono text-[var(--text-muted)] mt-1">
                {grant.committee.slice(0, 10)}…{grant.committee.slice(-6)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold mono">{formatUsdc(grant.totalBudget)}</p>
              <p className="text-xs text-[var(--text-muted)]">total budget</p>
            </div>
          </div>

          <div className="space-y-2">
            {grant.milestones.length === 0 && (
              <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)] text-sm">
                No milestones added yet.
              </div>
            )}
            {grant.milestones.map((m) => {
              const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG[1]
              const isSelected = selected?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelected(isSelected ? null : m); setStatusMsg('') }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                    ${isSelected
                      ? 'border-[var(--accent2)] bg-[var(--accent2)]/5'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hi)]'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium mono truncate">{m.id.slice(0, 18)}…</p>
                      <p className="text-xs text-[var(--text-muted)] mono mt-0.5">
                        {m.builder.slice(0, 8)}…{m.builder.slice(-6)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                      <span className="font-bold mono text-sm">{formatUsdc(m.amount)}</span>
                    </div>
                  </div>
                  {m.reviewNotes && (
                    <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-1">{m.reviewNotes}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right — detail panel */}
        {selected && (
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">

            {/* Milestone info */}
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
                Milestone Detail
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Amount</span>
                  <span className="font-bold mono">{formatUsdc(selected.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Builder</span>
                  <span className="mono text-xs">{selected.builder.slice(0, 10)}…{selected.builder.slice(-4)}</span>
                </div>
                {selected.evidenceCid && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Evidence</span>
                    <a href={`https://ipfs.io/ipfs/${selected.evidenceCid}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[var(--accent2)] hover:underline text-xs mono">
                      {selected.evidenceCid.slice(0, 12)}… ↗
                    </a>
                  </div>
                )}
                {selected.txHash && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Tx</span>
                    <a href={`https://sepolia.basescan.org/tx/${selected.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline text-xs mono">
                      {selected.txHash.slice(0, 10)}… ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Status message */}
              {statusMsg && (
                <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed bg-[var(--bg-hover)] p-2 rounded-lg">
                  {statusMsg}
                </p>
              )}

              {/* Committee: Review action */}
              {isCommittee && selected.status === MilestoneStatus.PENDING && selected.evidenceCid && (
                <button
                  onClick={() => triggerReview(selected.id)}
                  disabled={reviewing}
                  className="mt-4 w-full py-2 rounded-lg bg-[var(--accent2)] text-[#0a0a0f]
                             font-semibold text-sm hover:bg-[var(--accent2)]/90
                             disabled:opacity-50 transition-colors"
                >
                  {reviewing ? '⏳ Reviewing…' : '🔍 Trigger Reviewer Agent'}
                </button>
              )}

              {/* Committee: ERC-7715 permission + Distribute */}
              {isCommittee && selected.status === MilestoneStatus.APPROVED && (
                <div className="mt-4 space-y-3">
                  {!permissionsCtx && (
                    <PermissionRequest
                      milestoneId={selected.id}
                      milestoneAmount={BigInt(selected.amount)}
                      onGranted={(ctx) => setPermissionsCtx(ctx)}
                    />
                  )}
                  {!!permissionsCtx && (
                    <button
                      onClick={() => triggerDistribute(selected.id)}
                      disabled={distributing}
                      className="w-full py-2 rounded-lg bg-[var(--accent)] text-[#0a0a0f]
                                 font-semibold text-sm hover:bg-[var(--accent)]/90
                                 disabled:opacity-50 transition-colors"
                    >
                      {distributing ? '⏳ Executing via 1Shot…' : '💸 Distribute via Agent'}
                    </button>
                  )}
                </div>
              )}

              {/* Builder: submit evidence */}
              {address?.toLowerCase() === selected.builder.toLowerCase()
                && (selected.status === MilestoneStatus.PENDING || selected.status === MilestoneStatus.REJECTED) && (
                <Link
                  href={`/grants/${grantId}/${selected.id}/submit`}
                  className="mt-4 block text-center w-full py-2 rounded-lg border border-[var(--accent)]
                             text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent)]/5 transition-colors"
                >
                  Submit Evidence
                </Link>
              )}
            </div>

            {/* Venice review report */}
            {reviewResult && (
              <ReviewReport result={reviewResult} />
            )}

            {/* 1Shot transaction status */}
            {distResult && distResult.oneshotTaskId && (
              <TransactionStatus
                taskId={distResult.oneshotTaskId}
                txHash={distResult.txHash || undefined}
                initialStatus={distResult.status}
                onConfirmed={(hash) => refreshGrant(selected.id)}
              />
            )}

            {/* Agent pipeline */}
            <AgentStatusPanel
              milestoneStatus={selected.status}
              reviewSummary={selected.reviewNotes ?? undefined}
              txHash={selected.txHash ?? undefined}
            />

            {/* Delegation chain toggle */}
            <div>
              <button
                onClick={() => setShowChain(!showChain)}
                className="w-full text-left text-xs text-[var(--accent2)] hover:underline mb-2"
              >
                {showChain ? '▾ Hide' : '▸ Show'} delegation chain
              </button>
              {showChain && (
                <DelegationChain
                  committeeAddress={grant.committee}
                  reviewerAddress={process.env.NEXT_PUBLIC_REVIEWER_AGENT_ADDRESS}
                  distributorAddress={process.env.NEXT_PUBLIC_DISTRIBUTOR_AGENT_ADDRESS}
                  milestoneStatus={selected.status}
                  milestoneId={selected.id}
                  capAmount={formatUnits(BigInt(selected.amount), USDC_DECIMALS)}
                />
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  )
}