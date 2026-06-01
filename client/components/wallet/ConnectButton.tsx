'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from '@/config/chains'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = isConnected && chainId !== baseSepolia.id

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="px-4 py-2 rounded-lg border border-[var(--border-hi)] bg-[var(--bg-card)]
                   hover:border-[var(--accent2)] hover:bg-[var(--bg-hover)]
                   transition-all duration-200 text-sm font-medium tracking-wide"
      >
        Connect MetaMask
      </button>
    )
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        className="px-4 py-2 rounded-lg border border-[var(--warn)] text-[var(--warn)]
                   hover:bg-[var(--warn)]/10 transition-all duration-200 text-sm font-medium"
      >
        Switch to Base Sepolia
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)]
                      bg-[var(--bg-card)] text-sm mono">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] status-pulse" />
        <span className="text-[var(--text-muted)]">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
      </div>
      <button
        onClick={() => disconnect()}
        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)]
                   hover:border-[var(--danger)] hover:text-[var(--danger)]
                   transition-all duration-200 text-sm"
      >
        Disconnect
      </button>
    </div>
  )
}