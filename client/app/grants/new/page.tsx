'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, keccak256, encodePacked } from 'viem'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { MILESTONE_REGISTRY_ABI, USDC_ABI } from '@/lib/contracts/abis'
import { CONTRACTS, USDC_ADDRESS, ACTIVE_CHAIN_ID, USDC_DECIMALS } from '@/config/constants'

export default function NewGrantPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [title, setTitle] = useState('')
  const [budget, setBudget] = useState('')
  const [step, setStep] = useState<'form' | 'approve' | 'create' | 'done'>('form')
  const [error, setError] = useState('')

  const budgetWei = budget ? parseUnits(budget, USDC_DECIMALS) : 0n

  const grantId = title && address
    ? keccak256(encodePacked(
        ['string', 'address', 'uint256'],
        [title, address as `0x${string}`, BigInt(Date.now())]
      ))
    : undefined

  const { writeContract: approveUsdc, data: approveTxHash } = useWriteContract()
  const { isLoading: approveLoading, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash })

  const { writeContract: createGrant, data: createTxHash } = useWriteContract()
  const { isLoading: createLoading, isSuccess: createSuccess } =
    useWaitForTransactionReceipt({ hash: createTxHash })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !budget || !address || !grantId) return
    setError('')

    try {
      const res = await fetch('/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          committee: address,
          totalBudget: budgetWei.toString(),
        }),
      })

      if (!res.ok) throw new Error('Failed to create grant in DB')
      const grant = await res.json()

      setStep('approve')
      approveUsdc({
        address: USDC_ADDRESS[ACTIVE_CHAIN_ID],
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.GRANT_VAULT, budgetWei],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grant')
    }
  }

  if (approveSuccess && step === 'approve' && grantId && !createTxHash) {
    setStep('create')
    createGrant({
      address: CONTRACTS.MILESTONE_REGISTRY,
      abi: MILESTONE_REGISTRY_ABI,
      functionName: 'createGrant',
      args: [grantId as `0x${string}`, title, budgetWei],
    })
  }

  if (createSuccess && step === 'create') {
    setStep('done')
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight"><svg width="22" height="26" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 4 L92 24 L92 72 Q92 100 50 116 Q8 100 8 72 L8 24 Z" fill="#1a1a2e" stroke="#6366f1" strokeWidth="3"/><path d="M62 35 A22 22 0 1 0 70 68 L50 68 L50 56 L62 56" stroke="#6ee7b7" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="82" cy="32" r="4" fill="#6ee7b7" opacity="0.9"/></svg>GrantGuard</Link>
          <span className="text-[var(--border-hi)]">/</span>
          <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">Dashboard</Link>
          <span className="text-[var(--border-hi)]">/</span>
          <span>New Grant</span>
        </div>
        <ConnectButton />
      </nav>

      <div className="flex-1 flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-2">Create Grant Program</h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Define the grant and fund it with USDC. The GrantVault will hold funds until milestones are approved.
          </p>

          {!isConnected ? (
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-center">
              <p className="text-[var(--text-muted)] mb-4">Connect your wallet to create a grant.</p>
              <ConnectButton />
            </div>
          ) : step === 'done' ? (
            <div className="p-6 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/5 text-center">
              <p className="text-3xl mb-3">✓</p>
              <p className="font-semibold text-[var(--accent)]">Grant created successfully!</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Redirecting to dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Grant Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GrantGuard Protocol v2"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)]
                             bg-[var(--bg-card)] text-[var(--text)]
                             focus:outline-none focus:border-[var(--accent2)]
                             placeholder:text-[var(--text-muted)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Total Budget (USDC)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    required
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-[var(--border)]
                               bg-[var(--bg-card)] text-[var(--text)]
                               focus:outline-none focus:border-[var(--accent2)]
                               placeholder:text-[var(--text-muted)] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">USDC</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  You will be asked to approve this amount from your wallet.
                </p>
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 rounded-lg">
                  {error}
                </p>
              )}

              {/* Step indicator */}
              {step !== 'form' && (
                <div className="p-4 rounded-lg border border-[var(--accent2)]/30 bg-[var(--accent2)]/5 text-sm">
                  {step === 'approve' && (
                    <span className="text-[var(--accent2)]">
                      {approveLoading ? '⏳ Approving USDC spend…' : '⌛ Waiting for approval…'}
                    </span>
                  )}
                  {step === 'create' && (
                    <span className="text-[var(--accent2)]">
                      {createLoading ? '⏳ Creating grant on-chain…' : '⌛ Confirming…'}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={step !== 'form' || !title || !budget}
                className="w-full py-3 rounded-lg bg-[var(--accent2)] text-[#0a0a0f]
                           font-semibold hover:bg-[var(--accent2)]/90
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create Grant + Fund Vault
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}