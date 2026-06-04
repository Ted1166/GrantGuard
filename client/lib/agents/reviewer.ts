import { veniceChat } from '@/lib/venice/client'
import { REVIEWER_SYSTEM_PROMPT, REVIEWER_USER_TEMPLATE } from '@/lib/venice/prompts'
import { getRepoSummary } from '@/lib/github/client'
import { formatUnits } from 'viem'
import { USDC_DECIMALS } from '@/config/constants'
import type { ReviewInput, ReviewResult } from '@/types/agent'

export async function runReviewerAgent(input: ReviewInput): Promise<ReviewResult> {
  let githubSummary = 'No GitHub repository provided — evidence limited to IPFS CID only.'
  let githubData: ReviewResult['githubData'] = undefined

  if (input.githubRepo) {
    try {
      const ghData = await getRepoSummary(input.githubRepo)
      githubSummary = ghData.summary
      githubData = {
        commits: ghData.commits,
        prsmerged: ghData.mergedPRs,
        lastActivity: ghData.lastCommitDate ?? 'unknown',
      }

      if (ghData.commits === 0) {
        githubSummary += '\n⚠️ FRAUD SIGNAL: Zero commits found in the last 30 days.'
      }

      if (!ghData.hasTests) {
        githubSummary += '\n⚠️ NOTE: No test files detected in recent commits.'
      }
    } catch (err) {
      githubSummary = `GitHub fetch failed: ${err instanceof Error ? err.message : 'unknown error'}. Cannot verify repository activity — treat as unverified submission.`
    }
  } else {
    githubSummary += '\n⚠️ NOTE: No GitHub repo provided. Cannot verify development activity.'
  }

  const amountUsdc = formatUnits(input.amount, USDC_DECIMALS)

  const userMessage = REVIEWER_USER_TEMPLATE({
    milestoneId: input.milestoneId,
    builder: input.builder,
    amountUsdc,
    evidenceCid: input.evidenceCid || 'NOT PROVIDED — automatic rejection candidate',
    githubSummary,
    milestoneDescription: input.milestoneDescription || 'No description provided by committee.',
  })

  const rawResponse = await veniceChat(
    REVIEWER_SYSTEM_PROMPT,
    userMessage,
    { maxTokens: 1024, temperature: 0.1 }
  )

  let parsed: {
    approved: boolean
    score: number
    reasoning: string
    summary: string
    fraudFlags?: string[]
    milestoneAligned?: boolean
  }

  try {
    const cleaned = rawResponse.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {
      approved: false,
      score: 0,
      reasoning: `Venice response parse error: ${rawResponse.slice(0, 200)}`,
      summary: 'Review failed — AI response could not be parsed. Manual review required.',
      fraudFlags: ['parse_error'],
    }
  }

  if (!input.evidenceCid) {
    parsed.approved = false
    parsed.score = 0
    parsed.fraudFlags = [...(parsed.fraudFlags ?? []), 'no_evidence_cid']
    parsed.summary = 'Rejected: No evidence submitted. Builder must provide an IPFS CID.'
  }

  return {
    milestoneId: input.milestoneId,
    approved: Boolean(parsed.approved),
    score: Number(parsed.score ?? 0),
    reasoning: parsed.reasoning ?? '',
    summary: parsed.summary ?? '',
    githubData,
  }
}