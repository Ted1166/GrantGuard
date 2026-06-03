'use client'

import { useEffect, useState } from 'react'

interface Props {
  taskId: string
  txHash?: string
  initialStatus?: 'pending' | 'submitted' | 'confirmed' | 'failed'
  onConfirmed?: (txHash: string) => void
}

type Status = 'pending' | 'submitted' | 'confirmed' | 'failed'

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: string }> = {
  pending: { label: 'Queued', color: 'var(--text-muted)', icon: '⏳' },
  submitted: { label: 'Submitted', color: 'var(--warn)', icon: '📡' },
  confirmed: { label: 'Confirmed', color: 'var(--accent)', icon: '✓'  },
  failed: { label: 'Failed', color: 'var(--danger)', icon: '✗'  },
}

export function TransactionStatus({ taskId, txHash: initialTxHash, initialStatus = 'pending', onConfirmed }: Props) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [txHash, setTxHash] = useState(initialTxHash ?? '')
  const [polling, setPolling] = useState(initialStatus !== 'confirmed' && initialStatus !== 'failed')

  useEffect(() => {
    if (!polling || !taskId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/distribute?taskId=${taskId}`)
        if (!res.ok) return

        const data = await res.json()
        const newStatus: Status = data.status ?? 'pending'
        const newTxHash = data.txHash ?? ''

        setStatus(newStatus)
        if (newTxHash) setTxHash(newTxHash)

        if (newStatus === 'confirmed' || newStatus === 'failed') {
          setPolling(false)
          clearInterval(interval)
          if (newStatus === 'confirmed' && newTxHash && onConfirmed) {
            onConfirmed(newTxHash)
          }
        }
      } catch {
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [taskId, polling, onConfirmed])

  const cfg = STATUS_CONFIG[status]

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
          1Shot Relay Status
        </span>
        {polling && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] status-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0"
          style={{
            borderColor: cfg.color,
            backgroundColor: cfg.color + '15',
            color: cfg.color,
          }}
        >
          {status === 'submitted' || status === 'pending' ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            cfg.icon
          )}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-xs text-[var(--text-muted)] mono">Task: {taskId.slice(0, 16)}…</p>
        </div>
      </div>

      {/* Transaction hash */}
      {txHash && (
        <div className="p-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Transaction hash</p>
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs mono text-[var(--accent)] hover:underline break-all"
          >
            {txHash}
          </a>
        </div>
      )}

      {/* 1Shot attribution */}
      <p className="text-[10px] text-[var(--text-muted)] opacity-60">
        Gas abstracted via 1Shot Permissionless Relayer · ERC-7710
      </p>
    </div>
  )
}