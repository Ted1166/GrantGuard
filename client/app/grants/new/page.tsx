'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, keccak256, encodePacked } from 'viem'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { MILESTONE_REGISTRY_ABI, USDC_ABI } from '@/lib/contracts/abis'
import { CONTRACTS, USDC_ADDRESS, ACTIVE_CHAIN_ID, USDC_DECIMALS } from '@/config/constants'
import { TermsModal } from '@/components/grants/TermsModal'

export default function NewGrantPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [title, setTitle] = useState('')
  const [budget, setBudget] = useState('')
  const [step, setStep] = useState<'form' | 'approve' | 'create' | 'done'>('form')
  const [error, setError] = useState('')

  const stableGrantId = useRef<`0x${string}` | null>(null)
  const stableBudgetWei = useRef<bigint>(0n)
  const stableTitle = useRef<string>('')
  const approveAdvanced = useRef(false)
  const [showTerms, setShowTerms] = useState(false)
  const [termsSignature, setTermsSignature] = useState('')

  const { writeContract: approveUsdc, data: approveTxHash } = useWriteContract()
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash })

  const { writeContract: createGrant, data: createTxHash } = useWriteContract()
  const { isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createTxHash })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !budget || !address) return
    setError('')
    if (!termsSignature) {
      setShowTerms(true)
      return
    }
    try {
      const budgetWei = parseUnits(budget, USDC_DECIMALS)

      const grantId = keccak256(
        encodePacked(
          ['string', 'address'],
          [title, address as `0x${string}`]
        )
      ) as `0x${string}`

      stableGrantId.current = grantId
      stableBudgetWei.current = budgetWei
      stableTitle.current = title
      approveAdvanced.current = false

      const res = await fetch('/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: grantId,
          title,
          committee: address,
          totalBudget: budgetWei.toString(),
          termsSignature,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'DB save failed')

      setStep('approve')
      approveUsdc({
        address: USDC_ADDRESS[ACTIVE_CHAIN_ID],
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.GRANT_VAULT, budgetWei],
        maxFeePerGas: 50000000n,
        maxPriorityFeePerGas: 1000000n,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grant')
      setStep('form')
    }
  }

  if (
    approveSuccess &&
    step === 'approve' &&
    stableGrantId.current &&
    !approveAdvanced.current
  ) {
    approveAdvanced.current = true
    setStep('create')
    createGrant({
      address: CONTRACTS.MILESTONE_REGISTRY,
      abi: MILESTONE_REGISTRY_ABI,
      functionName: 'createGrant',
      args: [stableGrantId.current, stableTitle.current, stableBudgetWei.current],
      maxFeePerGas: 50000000n,
      maxPriorityFeePerGas: 1000000n,
    })
  }

  if (createSuccess && step === 'create') {
    setStep('done')
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  const Logo = () => (
    <svg width="22" height="26" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 4 L92 24 L92 72 Q92 100 50 116 Q8 100 8 72 L8 24 Z" fill="#1a1a2e" stroke="#6366f1" strokeWidth="3"/>
      <path d="M62 35 A22 22 0 1 0 70 68 L50 68 L50 56 L62 56" stroke="#6ee7b7" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <circle cx="82" cy="32" r="4" fill="#6ee7b7" opacity="0.9"/>
    </svg>
  )

  return (
    <main className="min-h-dvh flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <Logo />GrantGuard
          </Link>
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
            Define the grant and fund it with USDC. The GrantVault holds funds until
            milestones are AI-verified and approved.
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
            <form id="grant-form" onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Grant Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GrantGuard Protocol v2"
                  required
                  disabled={step !== 'form'}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)]
                             bg-[var(--bg-card)] text-[var(--text)]
                             focus:outline-none focus:border-[var(--accent2)]
                             placeholder:text-[var(--text-muted)] transition-colors
                             disabled:opacity-50"
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
                    min="0.000001"
                    step="0.000001"
                    required
                    disabled={step !== 'form'}
                    className="w-full pl-8 pr-16 py-3 rounded-lg border border-[var(--border)]
                               bg-[var(--bg-card)] text-[var(--text)]
                               focus:outline-none focus:border-[var(--accent2)]
                               placeholder:text-[var(--text-muted)] transition-colors
                               disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">USDC</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Funds are locked in GrantVault — only released when milestones are AI-verified.
                </p>
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 rounded-lg">
                  {error}
                </p>
              )}

              {/* Step progress */}
              {step !== 'form' && (
                <div className="space-y-2">
                  {[
                    { key: 'approve', label: 'Step 1: Approve USDC spend' },
                    { key: 'create',  label: 'Step 2: Register grant on-chain' },
                  ].map((s) => {
                    const isActive = step === s.key
                    const isDone = (s.key === 'approve' && (step === 'create' || step === 'done' as string))
                    return (
                      <div key={s.key} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                        isDone ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' :
                        isActive ? 'border-[var(--accent2)]/30 bg-[var(--accent2)]/5' :
                        'border-[var(--border)] opacity-40'
                      }`}>
                        <span className="text-sm">
                          {isDone ? '✓' : isActive ? (
                            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : '○'}
                        </span>
                        <span className={`text-sm ${isDone ? 'text-[var(--accent)]' : isActive ? 'text-[var(--accent2)]' : 'text-[var(--text-muted)]'}`}>
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
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
      {showTerms && (
        <TermsModal
          grantTitle={title}
          totalBudget={budget}
          onAccepted={(sig) => {
            setTermsSignature(sig)
            setShowTerms(false)
            // Auto-submit after terms accepted
            document.getElementById('grant-form')?.dispatchEvent(
              new Event('submit', { cancelable: true, bubbles: true })
            )
          }}
          onDismiss={() => setShowTerms(false)}
        />
      )}
    </main>
  )
}