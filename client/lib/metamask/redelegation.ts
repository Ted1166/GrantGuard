import {
  createDelegation,
  signDelegation,
  getSmartAccountsEnvironment,
  ROOT_AUTHORITY,
  type Implementation,
  toMetaMaskSmartAccount,
} from '@metamask/smart-accounts-kit'
import { createPublicClient, http, encodeAbiParameters, parseAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from '@/config/chains'
import { CONTRACTS, ACTIVE_CHAIN_ID, DELEGATION_MANAGER } from '@/config/constants'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

const environment = getSmartAccountsEnvironment(ACTIVE_CHAIN_ID)

export interface AgentDelegationChain {
  reviewerDelegation: Awaited<ReturnType<typeof createDelegation>>
  reviewerSignature: `0x${string}`

  distributorDelegation: Awaited<ReturnType<typeof createDelegation>>
  distributorSignature: `0x${string}`

  auditorDelegation: Awaited<ReturnType<typeof createDelegation>>
  auditorSignature: `0x${string}`

  delegationChain: unknown[]
}

function buildCapEnforcerCaveat(milestoneId: `0x${string}`, maxAmount: bigint) {
  const terms = encodeAbiParameters(
    parseAbiParameters('bytes32, uint256, address'),
    [milestoneId, maxAmount, CONTRACTS.MILESTONE_REGISTRY]
  ) as `0x${string}`

  return {
    enforcer: CONTRACTS.CAP_ENFORCER,
    terms,
    args: '0x' as `0x${string}`,
  }
}

export async function buildDelegationChain(
  committeePrivateKey: `0x${string}`,
  milestoneId: `0x${string}`,
  milestoneAmount: bigint
): Promise<AgentDelegationChain> {
  const delegationManager = DELEGATION_MANAGER[ACTIVE_CHAIN_ID]

  const committeeSigner = privateKeyToAccount(committeePrivateKey)

  const committeeSmartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: 'Hybrid' as unknown as Implementation,
    deployParams: [committeeSigner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: committeeSigner },
  })

  const reviewerAddress = process.env.REVIEWER_AGENT_ADDRESS as `0x${string}`
  const distributorAddress = process.env.DISTRIBUTOR_AGENT_ADDRESS as `0x${string}`
  const auditorAddress = process.env.REVIEWER_AGENT_ADDRESS as `0x${string}`

  const reviewerDelegation = createDelegation({
    environment,
    from: committeeSmartAccount.address,
    to: reviewerAddress,
    scope: { type: 'any' } as never,
    caveats: [],
    } as unknown as Parameters<typeof createDelegation>[0])

  const reviewerSignature = await signDelegation({
    privateKey: committeePrivateKey,
    delegation: reviewerDelegation,
    delegationManager,
    chainId: ACTIVE_CHAIN_ID,
    allowInsecureUnrestrictedDelegation: true,
  })

  const signedReviewerDelegation = { ...reviewerDelegation, signature: reviewerSignature }

  const reviewerPrivateKey = process.env.REVIEWER_AGENT_KEY as `0x${string}`
  const capCaveat = buildCapEnforcerCaveat(milestoneId, milestoneAmount)

  const distributorDelegation = createDelegation({
    environment,
    from: reviewerAddress,
    to: distributorAddress,
    caveats: [capCaveat],
    parentDelegation: signedReviewerDelegation,
  } as Parameters<typeof createDelegation>[0])

  const distributorSignature = await signDelegation({
    privateKey: reviewerPrivateKey,
    delegation: distributorDelegation,
    delegationManager,
    chainId: ACTIVE_CHAIN_ID,
  })

  const signedDistributorDelegation = { ...distributorDelegation, signature: distributorSignature }

  const distributorPrivateKey = process.env.DISTRIBUTOR_AGENT_KEY as `0x${string}`

  const auditorDelegation = createDelegation({
    environment,
    from: distributorAddress,
    to: auditorAddress,
    caveats: [],
    parentDelegation: signedDistributorDelegation,
  } as Parameters<typeof createDelegation>[0])

  const auditorSignature = await signDelegation({
    privateKey: distributorPrivateKey,
    delegation: auditorDelegation,
    delegationManager,
    chainId: ACTIVE_CHAIN_ID,
    allowInsecureUnrestrictedDelegation: true,
  })

  return {
    reviewerDelegation: signedReviewerDelegation,
    reviewerSignature,
    distributorDelegation: signedDistributorDelegation,
    distributorSignature,
    auditorDelegation: { ...auditorDelegation, signature: auditorSignature },
    auditorSignature,
    delegationChain: [signedDistributorDelegation, signedReviewerDelegation],
  }
}

export { environment }