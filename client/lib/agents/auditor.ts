import { createPublicClient, http } from 'viem'
import { baseSepolia } from '@/config/chains'
import { veniceChat } from '@/lib/venice/client'
import { AUDITOR_SYSTEM_PROMPT, AUDITOR_USER_TEMPLATE } from '@/lib/venice/prompts'
import { formatUnits } from 'viem'
import { USDC_DECIMALS } from '@/config/constants'
import type { AuditInput, AuditReport } from '@/types/agent'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export async function runAuditorAgent(input: AuditInput): Promise<AuditReport> {
  const { distributionResult, reviewResult } = input

  let confirmed = false
  let onChainStatus = 'not found'

  if (distributionResult.txHash && distributionResult.txHash !== '') {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: distributionResult.txHash as `0x${string}`,
      })
      confirmed = receipt.status === 'success'
      onChainStatus = receipt.status
    } catch {
      onChainStatus = 'receipt fetch failed'
    }
  }

  const userMessage = AUDITOR_USER_TEMPLATE({
    milestoneId: input.milestoneId,
    txHash: distributionResult.txHash || 'pending',
    expectedAmount: formatUnits(
      BigInt(0),
      USDC_DECIMALS
    ),
    builder: 'builder address',
    reviewSummary: reviewResult.summary,
  })

  let auditSummary = ''
  try {
    const rawResponse = await veniceChat(
      AUDITOR_SYSTEM_PROMPT,
      userMessage,
      { maxTokens: 512 }
    )
    const cleaned = rawResponse.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    auditSummary = parsed.summary ?? rawResponse
    confirmed = confirmed && Boolean(parsed.confirmed)
  } catch {
    auditSummary = `On-chain status: ${onChainStatus}. Tx: ${distributionResult.txHash}`
  }

  return {
    milestoneId: input.milestoneId,
    txHash: distributionResult.txHash,
    confirmed,
    summary: auditSummary,
    timestamp: new Date(),
  }
}