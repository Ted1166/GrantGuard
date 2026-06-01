import {
  createDelegation,
  ROOT_AUTHORITY,
  getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { CONTRACTS, ACTIVE_CHAIN_ID } from '@/config/constants'

const environment = getSmartAccountsEnvironment(ACTIVE_CHAIN_ID)

export function buildDelegation(params: {
  from: `0x${string}`
  to: `0x${string}`
  caveats?: { enforcer: `0x${string}`; terms: `0x${string}`; args: `0x${string}` }[]
}) {
  return createDelegation({
    environment,
    from: params.from,
    to: params.to,
    caveats: params.caveats ?? [],
    scope: { type: 'any' } as never,
  } as Parameters<typeof createDelegation>[0])
}

export function buildMilestoneCapCaveat(
  milestoneId: `0x${string}`,
  maxAmount: bigint
): { enforcer: `0x${string}`; terms: `0x${string}`; args: `0x${string}` } {
  const terms = encodeAbiParameters(
    parseAbiParameters('bytes32, uint256, address'),
    [milestoneId, maxAmount, CONTRACTS.MILESTONE_REGISTRY]
  ) as `0x${string}`

  return {
    enforcer: CONTRACTS.CAP_ENFORCER,
    terms,
    args: '0x',
  }
}

export { ROOT_AUTHORITY, environment }