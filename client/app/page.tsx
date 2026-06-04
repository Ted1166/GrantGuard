import Link from 'next/link'
import { ConnectButton } from '@/components/wallet/ConnectButton'

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 4 L92 24 L92 72 Q92 100 50 116 Q8 100 8 72 L8 24 Z" fill="#1a1a2e" stroke="#6366f1" strokeWidth="3"/>
                <path d="M62 35 A22 22 0 1 0 70 68 L50 68 L50 56 L62 56" stroke="#6ee7b7" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <circle cx="82" cy="32" r="4" fill="#6ee7b7" opacity="0.9"/>
              </svg>
          <span className="font-bold tracking-tight">GrantGuard</span>
        </div>
        <ConnectButton />
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-24 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        border border-[var(--accent2)]/30 bg-[var(--accent2)]/5 text-xs
                        text-[var(--accent2)] tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent2)] status-pulse" />
          Powered by Venice AI · MetaMask Smart Accounts · 1Shot
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] max-w-3xl">
          Grant payments
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r
                           from-[var(--accent2)] via-[var(--accent)] to-[var(--accent2)]">
            run themselves.
          </span>
        </h1>

        <p className="mt-8 max-w-lg text-[var(--text-muted)] text-lg leading-relaxed">
          A privacy-first AI agent that reviews milestone submissions, verifies deliverables,
          and autonomously distributes USDC — with cryptographic spend limits enforced at
          the delegation layer.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-[var(--accent2)] text-[#0a0a0f]
                       font-semibold hover:bg-[var(--accent2)]/90 transition-colors"
          >
            Open Dashboard
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg border border-[var(--border)]
                       hover:border-[var(--border-hi)] transition-colors text-sm"
          >
            View on GitHub →
          </a>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
          {[
            {
              icon: '🔒',
              title: 'Private AI Reasoning',
              desc: 'Venice AI reviews milestones with zero surveillance. Your grant decisions stay private.',
            },
            {
              icon: '⛓️',
              title: 'Cryptographic Spend Caps',
              desc: 'MilestoneCapEnforcer caveat prevents any agent from overpaying — enforced at the delegation layer.',
            },
            {
              icon: '⚡',
              title: 'Gas-Free Execution',
              desc: '1Shot Permissionless Relayer handles gas abstraction. Fees paid in USDC, no ETH needed.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]
                         hover:border-[var(--border-hi)] transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1 text-sm">{f.title}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-5 border-t border-[var(--border)] text-xs text-[var(--text-muted)]
                         flex items-center justify-between">
        <span>GrantGuard · Base Sepolia</span>
        <div className="flex gap-4">
          <a href="https://sepolia.basescan.org/address/0x9648Abb0943C9409Ea2d501E1a9773aCbE836Bb1"
             target="_blank" rel="noopener noreferrer"
             className="hover:text-[var(--text)] transition-colors">
            GrantVault ↗
          </a>
          <a href="https://sepolia.basescan.org/address/0xa1B21eedbB08cAC7F0F7AA29754bDBD794866139"
             target="_blank" rel="noopener noreferrer"
             className="hover:text-[var(--text)] transition-colors">
            Registry ↗
          </a>
        </div>
      </footer>
    </main>
  )
}