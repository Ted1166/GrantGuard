import { encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { send7710Transaction, getFeeData, waitForTask } from '@/lib/oneshot/client'
import { CONTRACTS, USDC_ADDRESS, ACTIVE_CHAIN_ID } from '@/config/constants'
import { USDC_ABI, MILESTONE_REGISTRY_ABI } from '@/lib/contracts/abis'
import type { DistributionInput, DistributionResult } from '@/types/agent'

export async function runDistributorAgent(
  input: DistributionInput,
  signedDelegations: unknown[],
  webhookUrl?: string
): Promise<DistributionResult> {
  const milestoneIdBytes = input.milestoneId as `0x${string}`

  const executePayoutCalldata = encodeFunctionData({
    abi: MILESTONE_REGISTRY_ABI,
    functionName: 'executePayout',
    args: [milestoneIdBytes],
  })

  const feeData = await getFeeData(ACTIVE_CHAIN_ID)

  const result = await send7710Transaction({
    chainId: ACTIVE_CHAIN_ID,
    delegations: signedDelegations,
    execution: {
      target: CONTRACTS.MILESTONE_REGISTRY,
      value: '0',
      callData: executePayoutCalldata,
    },
    feeToken: feeData.feeToken,
    webhookUrl,
  })

  if (!webhookUrl) {
    const finalStatus = await waitForTask(result.taskId)
    return {
      milestoneId: input.milestoneId,
      txHash: finalStatus.txHash ?? '',
      oneshotTaskId: result.taskId,
      status: finalStatus.status === 'confirmed' ? 'confirmed' : 'failed',
    }
  }

  return {
    milestoneId: input.milestoneId,
    txHash: '',
    oneshotTaskId: result.taskId,
    status: 'pending',
  }
}