'use client'

import { useState } from 'react'
import { parseUnits } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { MILESTONE_REGISTRY_ABI } from '@/lib/contracts/abis'
import { CONTRACTS, USDC_DECIMALS } from '@/config/constants'

interface Props {
  grantId: string
  onAdded: () => void
}

export function MilestoneSubmitForm({ grantId, onAdded }: Props) {
  const [builder, setBuilder] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { writeContract, data: txHash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess) {
    onAdded()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!builder || !amount) return
    setSaving(true)
    setError('')

    try {
      const amountWei = parseUnits(amount, USDC_DECIMALS)

      const res = await fetch(`/api/grants/${grantId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builder, amount: amountWei.toString() }),
      })

      if (!res.ok) throw new Error('Failed to create milestone')
      const milestone = await res.json()

      writeContract({
        address: CONTRACTS.MILESTONE_REGISTRY,
        abi: MILESTONE_REGISTRY_ABI,
        functionName: 'addMilestone',
        args: [
          grantId as `0x${string}`,
          milestone.id as `0x${string}`,
          builder as `0x${string}`,
          amountWei,
        ],
        maxFeePerGas: 50000000n,
        maxPriorityFeePerGas: 1000000n,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add milestone')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleAdd} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
      <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
        Add Milestone
      </h3>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Builder Address</label>
        <input
          type="text"
          value={builder}
          onChange={(e) => setBuilder(e.target.value)}
          placeholder="0x..."
          required
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)]
                     text-sm mono focus:outline-none focus:border-[var(--accent2)] transition-colors
                     placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Amount (USDC)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            required
            className="w-full pl-7 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)]
                       text-sm focus:outline-none focus:border-[var(--accent2)] transition-colors
                       placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={saving || !builder || !amount}
        className="w-full py-2 rounded-lg border border-[var(--accent2)] text-[var(--accent2)]
                   text-sm font-medium hover:bg-[var(--accent2)]/5
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? '⏳ Adding…' : '+ Add Milestone'}
      </button>
    </form>
  )
}