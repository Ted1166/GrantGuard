'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { MILESTONE_REGISTRY_ABI } from '@/lib/contracts/abis'
import { CONTRACTS } from '@/config/constants'

export default function SubmitEvidencePage() {
  const { grantId, milestoneId } = useParams<{ grantId: string; milestoneId: string }>()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [cid, setCid] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: txPending, isSuccess: txSuccess } =
    useWaitForTransactionReceipt({ hash: txHash })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cid || !address) return
    setError('')
    setSaving(true)

    try {
      await fetch(`/api/grants/${grantId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceCid: cid, githubRepo }),
      })

      writeContract({
        address: CONTRACTS.MILESTONE_REGISTRY,
        abi: MILESTONE_REGISTRY_ABI,
        functionName: 'submitEvidence',
        args: [milestoneId as `0x${string}`, cid],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setSaving(false)
    }
  }

  if (txSuccess) {
    setTimeout(() => router.push(`/grants/${grantId}`), 1500)
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight"><svg width="22" height="26" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 4 L92 24 L92 72 Q92 100 50 116 Q8 100 8 72 L8 24 Z" fill="#1a1a2e" stroke="#6366f1" strokeWidth="3"/><path d="M62 35 A22 22 0 1 0 70 68 L50 68 L50 56 L62 56" stroke="#6ee7b7" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="82" cy="32" r="4" fill="#6ee7b7" opacity="0.9"/></svg>GrantGuard</Link>
          <span className="text-[var(--border-hi)]">/</span>
          <Link href={`/grants/${grantId}`} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Grant
          </Link>
          <span className="text-[var(--border-hi)]">/</span>
          <span>Submit Evidence</span>
        </div>
        <ConnectButton />
      </nav>

      <div className="flex-1 flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-2">Submit Milestone Evidence</h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Provide your IPFS CID and GitHub repo. The Reviewer Agent will analyse your
            submission privately via Venice AI.
          </p>

          {txSuccess ? (
            <div className="p-6 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/5 text-center">
              <p className="text-3xl mb-3">✓</p>
              <p className="font-semibold text-[var(--accent)]">Evidence submitted!</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                The committee will trigger the AI review. Redirecting…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">IPFS CID</label>
                <input
                  type="text"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuyl…"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)]
                             bg-[var(--bg-card)] text-[var(--text)] mono text-sm
                             focus:outline-none focus:border-[var(--accent2)]
                             placeholder:text-[var(--text-muted)] transition-colors"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Pin your deliverable to IPFS and paste the CID here.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  GitHub Repository <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repository"
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)]
                             bg-[var(--bg-card)] text-[var(--text)] mono text-sm
                             focus:outline-none focus:border-[var(--accent2)]
                             placeholder:text-[var(--text-muted)] transition-colors"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  The Reviewer Agent will scrape your commit history, PRs, and issues.
                </p>
              </div>

              {/* What happens next */}
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] space-y-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  What happens next
                </p>
                {[
                  'Your evidence CID is written on-chain',
                  'The committee triggers the Reviewer Agent',
                  'Venice AI analyses your submission privately',
                  'If approved, the Distributor Agent pays you automatically',
                ].map((step, i) => (
                  <div key={i} className="flex gap-2 text-xs text-[var(--text-muted)]">
                    <span className="text-[var(--accent2)] flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 rounded-lg">
                  {error}
                </p>
              )}

              {txPending && (
                <p className="text-sm text-[var(--accent2)]">⏳ Confirming on-chain…</p>
              )}

              <button
                type="submit"
                disabled={!cid || !isConnected || saving || txPending}
                className="w-full py-3 rounded-lg bg-[var(--accent)] text-[#0a0a0f]
                           font-semibold hover:bg-[var(--accent)]/90
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Submit Evidence On-Chain
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}