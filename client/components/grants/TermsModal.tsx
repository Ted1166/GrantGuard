'use client'

import { useState } from 'react'
import { useSignMessage } from 'wagmi'

interface Props {
  grantTitle: string
  totalBudget: string
  onAccepted: (signature: string) => void
  onDismiss: () => void
}

export function TermsModal({ grantTitle, totalBudget, onAccepted, onDismiss }: Props) {
  const [checked, setChecked] = useState(false)
  const { signMessage, isPending } = useSignMessage({
    mutation: {
      onSuccess: (sig) => onAccepted(sig),
    },
  })

  function handleSign() {
    if (!checked) return
    signMessage({
      message: `I, as grant committee, authorize the GrantGuard program:\n\nGrant: ${grantTitle}\nBudget: ${totalBudget} USDC\n\nI agree that:\n1. Funds are locked in GrantVault until AI-verified milestone completion\n2. Only the registered builder wallet may submit evidence\n3. The Reviewer Agent's decision is final unless manually overridden\n4. Rejected milestones return funds to the vault — they are never lost\n5. My wallet is the sole authorized disbursement controller\n\nTimestamp: ${new Date().toISOString()}`,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-hi)] bg-[var(--bg-card)] p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Grant Program Agreement</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Sign to authorize this grant program
            </p>
          </div>
          <button onClick={onDismiss} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none">×</button>
        </div>

        {/* Grant summary */}
        <div className="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Grant</span>
            <span className="font-medium">{grantTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Total Budget</span>
            <span className="font-bold mono">${totalBudget} USDC</span>
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-2 text-xs text-[var(--text-muted)] leading-relaxed">
          {[
            'Funds are locked in GrantVault and only released upon AI-verified milestone completion.',
            'Only the wallet address registered as builder may submit evidence for each milestone.',
            'The Reviewer Agent (Venice AI) analyses submissions privately — reasoning is never logged by third parties.',
            'Rejected milestones remain locked — funds are not lost and builders may resubmit.',
            'The MilestoneCapEnforcer caveat cryptographically prevents any agent from overpaying.',
            'My connected wallet is the sole authorized grant committee address for this program.',
          ].map((term, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[var(--accent2)] flex-shrink-0 mt-0.5">✓</span>
              <span>{term}</span>
            </div>
          ))}
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            onClick={() => setChecked(!checked)}
            className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
              checked
                ? 'border-[var(--accent2)] bg-[var(--accent2)]'
                : 'border-[var(--border-hi)] group-hover:border-[var(--accent2)]'
            }`}
          >
            {checked && <span className="text-[#0a0a0f] text-xs font-bold">✓</span>}
          </div>
          <span className="text-sm">
            I have read and agree to the terms above. I understand that signing this message
            creates a cryptographic record of my authorization.
          </span>
        </label>

        {/* Sign button */}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm
                       text-[var(--text-muted)] hover:border-[var(--border-hi)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={!checked || isPending}
            className="flex-1 py-2.5 rounded-lg bg-[var(--accent2)] text-[#0a0a0f]
                       font-semibold text-sm hover:bg-[var(--accent2)]/90
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '⏳ Signing…' : 'Sign & Authorize'}
          </button>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] text-center">
          This is a free EIP-712 signature — no gas required. It creates a cryptographic record of your authorization.
        </p>
      </div>
    </div>
  )
}