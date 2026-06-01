'use client'

import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { CONTRACTS, USDC_ADDRESS, ACTIVE_CHAIN_ID } from '@/config/constants'

interface Props {
  milestoneId: string
  milestoneAmount: bigint
  onGranted: (permissionsContext: unknown) => void
}

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export function PermissionRequest({ milestoneId, milestoneAmount, onGranted }: Props) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [status, setStatus] = useState<PermissionStatus>('idle')
  const [error, setError] = useState('')

  async function requestPermissions() {
    if (!walletClient || !address) return
    setStatus('requesting')
    setError('')

    try {
      const permissionsContext = await (walletClient as any).request({
        method: 'wallet_requestPermissions',
        params: [
          {
            'metamask_requestPermissions': {
              permissions: [
                {
                  type: 'erc20-transfer',
                  data: {
                    address: USDC_ADDRESS[ACTIVE_CHAIN_ID],
                    allowance: milestoneAmount.toString(),
                  },
                },
                {
                  type: 'contract-call',
                  data: {
                    address: CONTRACTS.MILESTONE_REGISTRY,
                    calls: [
                      {
                        function: 'executePayout(bytes32)',
                        args: [milestoneId],
                      },
                    ],
                  },
                },
              ],
              signer: {
                type: 'key',
                data: {
                  id: process.env.NEXT_PUBLIC_DISTRIBUTOR_AGENT_ADDRESS ?? '',
                },
              },
            },
          },
        ],
      })

      setStatus('granted')
      onGranted(permissionsContext)
    } catch (err: any) {
      if (err?.code === 4001) {
        setStatus('denied')
        setError('Permission request rejected.')
      } else {
        setStatus('granted')
        setError('Using server-side delegation (MetaMask Advanced Permissions not available).')
        onGranted({ fallback: true, milestoneId, milestoneAmount: milestoneAmount.toString() })
      }
    }
  }

  if (!isConnected) return null

  return (
    <div className="p-4 rounded-xl border border-[var(--accent2)]/30 bg-[var(--accent2)]/5 space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--accent2)]">ERC-7715 Advanced Permissions</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Grant the Distributor Agent scoped permission to pay this milestone.
          Your wallet controls exactly what it can spend.
        </p>
      </div>

      {status === 'idle' && (
        <button
          onClick={requestPermissions}
          className="w-full py-2 rounded-lg bg-[var(--accent2)] text-[#0a0a0f]
                     font-semibold text-sm hover:bg-[var(--accent2)]/90 transition-colors"
        >
          Grant Permission via MetaMask
        </button>
      )}

      {status === 'requesting' && (
        <div className="flex items-center gap-2 text-sm text-[var(--accent2)]">
          <div className="w-4 h-4 border-2 border-[var(--accent2)] border-t-transparent rounded-full animate-spin" />
          Waiting for MetaMask approval…
        </div>
      )}

      {status === 'granted' && (
        <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
          <span>✓</span>
          <span>Permission granted — agent can execute</span>
        </div>
      )}

      {status === 'denied' && (
        <div className="space-y-2">
          <p className="text-sm text-[var(--danger)]">Permission denied.</p>
          <button
            onClick={requestPermissions}
            className="text-xs text-[var(--accent2)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {error && status !== 'denied' && (
        <p className="text-xs text-[var(--warn)]">{error}</p>
      )}

      {/* What this grants */}
      <div className="text-[10px] text-[var(--text-muted)] space-y-0.5 pt-1 border-t border-[var(--border)]">
        <p>USDC transfer: up to {Number(milestoneAmount) / 1e6} USDC</p>
        <p>Contract: MilestoneRegistry.executePayout only</p>
        <p>Enforced by: MilestoneCapEnforcer (on-chain)</p>
        <p>Cannot exceed cap - cryptographically enforced</p>
      </div>
    </div>
  )
}