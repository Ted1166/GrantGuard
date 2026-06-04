export interface ReviewInput {
  milestoneId: string
  grantId: string
  builder: string
  amount: bigint
  evidenceCid: string
  githubRepo?: string
  milestoneDescription?: string
}

export interface ReviewResult {
  milestoneId: string
  approved: boolean
  score: number
  reasoning: string
  summary: string
  githubData?: {
    commits: number
    prsmerged: number
    lastActivity: string
  }
}

export interface DistributionInput {
  milestoneId: string
  grantId: string
  builder: string
  amount: bigint
  reviewResult: ReviewResult
}

export interface DistributionResult {
  milestoneId: string
  txHash: string
  oneshotTaskId: string
  status: 'pending' | 'confirmed' | 'failed'
  gasUsed?: string
  gasPaidUsdc?: string
}

export interface AuditInput {
  milestoneId: string
  distributionResult: DistributionResult
  reviewResult: ReviewResult
}

export interface AuditReport {
  milestoneId: string
  txHash: string
  confirmed: boolean
  summary: string
  timestamp: Date
}

export interface AgentTask {
  id: string
  type: 'review' | 'distribute' | 'audit'
  milestoneId: string
  status: 'queued' | 'running' | 'done' | 'failed'
  result?: ReviewResult | DistributionResult | AuditReport
  error?: string
  createdAt: Date
  updatedAt: Date
}