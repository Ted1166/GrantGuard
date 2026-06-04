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
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const { writeContract, data: txHash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess && !done) {
    setDone(true)
    onAdded()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!builder || !amount || !description) return
    setSaving(true)
    setError('')

    try {
      const amountWei = parseUnits(amount, USDC_DECIMALS)

      // 1. Save to DB with description (AI uses this to verify submissions)
      const res = await fetch(`/api/grants/${grantId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builder, amount: amountWei.toString(), description }),
      })

      if (!res.ok) throw new Error('Failed to create milestone')
      const milestone = await res.json()

      // 2. Register on-chain - only this builder wallet can submit evidence
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
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
          Add Milestone
        </h3>
        <span className="text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border)]">
          Only registered builder can submit
        </span>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Builder Wallet Address
          <span className="text-[var(--danger)] ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={builder}
          onChange={(e) => setBuilder(e.target.value)}
          placeholder="0x... (only this wallet can submit evidence)"
          required
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)]
                     text-sm mono focus:outline-none focus:border-[var(--accent2)] transition-colors
                     placeholder:text-[var(--text-muted)]"
        />
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Enforced on-chain — any other wallet's submission will revert.
        </p>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Milestone Description
          <span className="text-[var(--danger)] ml-0.5">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Deploy smart contract to Base Sepolia with full test coverage and audit report..."
          required
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)]
                     text-sm focus:outline-none focus:border-[var(--accent2)] transition-colors
                     placeholder:text-[var(--text-muted)] resize-none"
        />
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          The AI uses this to verify the builder's submission matches what was promised.
        </p>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Payment Amount (USDC)
          <span className="text-[var(--danger)] ml-0.5">*</span>
        </label>
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
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Enforced by MilestoneCapEnforcer — agent cannot overpay.
        </p>
      </div>

      {error && <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 p-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={saving || !builder || !amount || !description}
        className="w-full py-2 rounded-lg border border-[var(--accent2)] text-[var(--accent2)]
                   text-sm font-medium hover:bg-[var(--accent2)]/5
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? '⏳ Registering on-chain…' : '+ Add Milestone'}
      </button>
    </form>
  )
}