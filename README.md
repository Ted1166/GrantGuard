# GrantGuard

**Privacy-first autonomous grant management powered by AI agents, cryptographic delegation, and on-chain enforcement.**

GrantGuard replaces the slow, manual and politically fraught world of Web3 grant distribution with an autonomous system where AI agents review milestone submissions, verify deliverables privately and release USDC payments all without the grant committee signing a single transaction after setup.

---

## Overview

Grant programs today require committee members to manually review every submission, sign every payment, and trust that nobody games the process. GrantGuard removes that burden entirely.

The committee defines the grant, funds the vault, and registers milestones. From that point, three AI agents handle everything:

- **Reviewer Agent** analyses builder submissions privately via Venice AI, checking GitHub activity, IPFS evidence, and alignment with the milestone description. It approves or rejects with a scored reasoning report.
- **Distributor Agent** holds a cryptographically scoped delegation — it can only pay the exact milestone amount to the exact builder, enforced at the delegation layer by a custom on-chain caveat.
- **Auditor Agent** verifies the on-chain payment after execution and generates an immutable audit trail.

Nobody can override these constraints. The committee cannot accidentally overpay. An agent cannot exceed its scope. The builder cannot submit for someone else's milestone.

---

## How It Works

### 1. Grant creation
The committee creates a grant program, funds the `GrantVault` with USDC, and adds milestones — each specifying the builder's wallet address, a description of what must be delivered, and the payment amount.

### 2. Builder submission
The builder submits their deliverable: an IPFS CID linking to their work and optionally a public GitHub repository. The submission is written on-chain. Only the registered builder wallet can submit — any other wallet's transaction reverts at the contract level.

### 3. AI review
The committee triggers the Reviewer Agent. Venice AI privately analyses the submission against the milestone description, checking GitHub commit history, PR activity, code substance, and fraud signals. Venice never stores the reasoning — it runs on private infrastructure with no third-party logging. The agent returns a scored JSON decision: approved or rejected, with specific feedback the builder can act on.

### 4. Delegation and payment
If approved, the committee grants an ERC-7715 permission scoped to the exact milestone. The system builds a three-layer delegation chain:

```
Committee smart account
  └─► Reviewer Agent    (read-only — cannot execute)
        └─► Distributor Agent  (scoped — MilestoneCapEnforcer limits spend)
              └─► Auditor Agent  (read-only — verifies outcome)
```

The Distributor Agent submits the payment via the 1Shot Permissionless Relayer. Gas is abstracted — paid in USDC, no ETH required. The `MilestoneCapEnforcer` caveat enforcer on-chain verifies that the agent cannot pay more than the approved amount, cannot pay a milestone that is not in `APPROVED` state, and cannot send a partial amount.

### 5. Audit
The Auditor Agent fetches the transaction receipt, confirms the payment landed, and generates a final audit report via Venice AI. The full chain — submission, review reasoning, delegation, payment, audit — is permanently recorded.

---

## Architecture

```
Frontend (Next.js)
  │
  ├── GrantVault.sol          USDC treasury — holds funds, gates payouts
  ├── MilestoneRegistry.sol   State machine: Pending → Approved → Paid → Rejected
  └── MilestoneCapEnforcer.sol  Custom ERC-7710 caveat — cryptographic spend cap
      │
      ├── Venice AI           Private reasoning — review + audit reports
      ├── 1Shot Relayer       Gas abstraction — ERC-7710, USDC fee
      └── GitHub API          Public commit/PR data for milestone verification
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.23, Foundry |
| Chain | Base Sepolia (testnet) → Base Mainnet |
| Smart accounts | MetaMask Smart Accounts Kit — `toMetaMaskSmartAccount` |
| Permissions | ERC-7715 Advanced Permissions via MetaMask |
| Delegation | ERC-7710 — `createDelegation`, `signDelegation`, redelegation chain |
| Caveat enforcer | Custom `MilestoneCapEnforcer` — per-milestone USDC cap |
| Gas abstraction | 1Shot Permissionless Relayer — no signup, no ETH needed |
| AI reasoning | Venice AI — OpenAI-compatible, private inference |
| Frontend | Next.js 16, wagmi v2, viem, TypeScript |
| Database | Prisma + SQLite (agent task tracking, milestone state) |
| Storage | IPFS (builder deliverable evidence) |

---

## Security Model

**Builder identity** is enforced at the contract level. `MilestoneRegistry.sol` checks `msg.sender == m.builder` on every `submitEvidence` call. Any other wallet's transaction reverts.

**Spend limits** are enforced cryptographically. The `MilestoneCapEnforcer` caveat runs inside the MetaMask Delegation Framework's `beforeHook` — it executes before any delegation is redeemed. It checks that the milestone is in `APPROVED` state, the transfer amount matches the registered amount exactly, and the amount does not exceed the cap encoded in the delegation terms. These checks run at the EVM level — they cannot be bypassed by the agent.

**AI fraud detection** is layered on top. The Reviewer Agent explicitly checks for zero-commit repositories, repos created after the grant date, misaligned submissions, missing evidence, and other fraud signals. Rejected milestones stay locked — funds remain in `GrantVault` and the builder receives specific feedback for resubmission.

**Privacy** is guaranteed by Venice AI's infrastructure. Reasoning about builder submissions never reaches OpenAI, Anthropic, or any logging third party. The committee's deliberation is private.

---

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|---|---|
| GrantVault | `0xbbf3D2490c9f2a87a522214A51C98Fc355862092` |
| MilestoneRegistry | `0x037A6b35B64Dc42512BE95885D87b8d54349e346` |
| MilestoneCapEnforcer | `0x2CA428434D5a53ce561E0B6198948ac82497bAf7` |

---

## Local Setup

```bash
# Clone
git clone https://github.com/your-org/grantguard
cd grantguard

# Contracts
cd contracts
forge install
forge test
forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $DEPLOYER_KEY --broadcast

# Frontend
cd ../client
cp .env.example .env.local
# Fill in: VENICE_API_KEY, REVIEWER_AGENT_KEY, DISTRIBUTOR_AGENT_KEY, DEPLOYER_KEY
npm install
npx prisma db push
npm run dev
```

---

## Environment Variables

```bash
# Contracts
NEXT_PUBLIC_GRANT_VAULT=0x...
NEXT_PUBLIC_MILESTONE_REGISTRY=0x...
NEXT_PUBLIC_CAP_ENFORCER=0x...

# Agents (server-side only)
REVIEWER_AGENT_ADDRESS=0x...
REVIEWER_AGENT_KEY=0x...
DISTRIBUTOR_AGENT_ADDRESS=0x...
DISTRIBUTOR_AGENT_KEY=0x...
DEPLOYER_KEY=0x...

# Venice AI
VENICE_API_KEY=...
VENICE_API_BASE=https://api.venice.ai/api/v1

# 1Shot
ONESHOT_RPC_URL=https://relayer.1shotapi.com/relayers

# Database
DATABASE_URL=file:./dev.db
```

---

## License

MIT