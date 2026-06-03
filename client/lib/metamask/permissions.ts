import { CONTRACTS, USDC_ADDRESS, ACTIVE_CHAIN_ID } from '@/config/constants'

export function buildPermissionRequest(
  milestoneId: string,
  milestoneAmount: bigint,
  distributorAddress: string
) {
  return {
    method: 'wallet_grantPermissions',
    params: [
      {
        chainId: `0x${ACTIVE_CHAIN_ID.toString(16)}`,
        address: distributorAddress,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        permissions: [
          {
            type: 'erc20-transfer',
            data: {
              address: USDC_ADDRESS[ACTIVE_CHAIN_ID],
              allowance: `0x${milestoneAmount.toString(16)}`,
            },
            required: true,
          },
          {
            type: 'contract-call',
            data: {
              address: CONTRACTS.MILESTONE_REGISTRY,
              abi: [
                {
                  name: 'executePayout',
                  type: 'function',
                  inputs: [{ name: 'milestoneId', type: 'bytes32' }],
                },
              ],
              functionName: 'executePayout',
              args: [milestoneId],
            },
            required: true,
          },
        ],
      },
    ],
  }
}

export async function supportsAdvancedPermissions(
  walletClient: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
): Promise<boolean> {
  try {
    const capabilities = await walletClient.request({
      method: 'wallet_getCapabilities',
      params: [],
    }) as Record<string, unknown>

    const chainCapabilities = capabilities?.[`0x${ACTIVE_CHAIN_ID.toString(16)}`] as Record<string, unknown> | undefined
    return Boolean(chainCapabilities?.permissions)
  } catch {
    return false
  }
}