'use client'

import { useState } from 'react'

interface Props {
  grantId: string
  currentStatus: string
  onChange: (newStatus: string) => void
}

const STATUSES = [
  { value: 'draft', label: 'Draft', color: '#8a8898' },
  { value: 'active', label: 'Active', color: '#6ee7b7' },
  { value: 'paused', label: 'Paused', color: '#fbbf24' },
  { value: 'ended', label: 'Ended', color: '#f87171' },
]

export function GrantStatusEditor({ grantId, currentStatus, onChange }: Props) {
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  async function updateStatus(status: string) {
    setSaving(true)
    setOpen(false)
    try {
      await fetch(`/api/grants/${grantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      onChange(status)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const current = STATUSES.find((s) => s.value === currentStatus) ?? STATUSES[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors"
        style={{ color: current.color, borderColor: current.color + '40', background: current.color + '10' }}
      >
        {saving ? '⏳' : current.label}
        <span className="opacity-60">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-8 left-0 z-20 w-36 rounded-xl border border-[var(--border-hi)]
                          bg-[var(--bg-card)] shadow-xl overflow-hidden">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--bg-hover)] transition-colors ${
                  s.value === currentStatus ? 'opacity-50 cursor-default' : ''
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
                {s.value === currentStatus && ' ✓'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}