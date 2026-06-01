import { veniceChat } from '@/lib/venice/client'
import { REVIEWER_SYSTEM_PROMPT, REVIEWER_USER_TEMPLATE } from '@/lib/venice/prompts'
import { getRepoSummary } from '@/lib/github/client'
import { formatUnits } from 'viem'
import { USDC_DECIMALS } from '@/config/constants'
import type { ReviewInput, ReviewResult } from '@/types/agent'

export async function runReviewerAgent(input: ReviewInput): Promise<ReviewResult> {
  let githubSummary = 'No GitHub repository provided.'
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
    } catch (err) {
      githubSummary = `GitHub fetch failed: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  }

  const amountUsdc = formatUnits(input.amount, USDC_DECIMALS)

  const userMessage = REVIEWER_USER_TEMPLATE({
    milestoneId: input.milestoneId,
    builder: input.builder,
    amountUsdc,
    evidenceCid: input.evidenceCid,
    githubSummary,
    milestoneName: input.milestoneId.slice(0, 10) + '...',
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
    flags?: string[]
  }

  try {
    const cleaned = rawResponse.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {
      approved: false,
      score: 0,
      reasoning: `Failed to parse Venice response: ${rawResponse.slice(0, 200)}`,
      summary: 'Review failed — could not parse AI response.',
    }
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