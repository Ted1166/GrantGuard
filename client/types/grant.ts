export enum MilestoneStatus {
  NONE = 0,
  PENDING = 1,
  UNDER_REVIEW = 2,
  APPROVED = 3,
  PAID = 4,
  REJECTED = 5,
}

export interface Grant {
  id: string
  title: string
  committee: string
  totalBudget: bigint
  active: boolean
  milestones: Milestone[]
  createdAt: Date
}

export interface Milestone {
  id: string
  grantId: string
  builder: string
  amount: bigint
  evidenceCid: string
  reviewNotes: string
  status: MilestoneStatus
  submittedAt: Date | null
  reviewedAt: Date | null
  paidAt: Date | null
}

export interface GrantRecord {
  id: string
  title: string
  committee: string
  totalBudget: string
  active: boolean
  createdAt: string
}

export interface MilestoneRecord {
  id: string
  grantId: string
  builder: string
  amount: string
  evidenceCid: string | null
  reviewNotes: string | null
  status: number
  txHash: string | null
  submittedAt: string | null
  reviewedAt: string | null
  paidAt: string | null
}