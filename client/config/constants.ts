export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
} as const

export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [CHAIN_IDS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
}

export const DELEGATION_MANAGER: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE_SEPOLIA]: '0x2a80B79a5eeBD95E700B1D2Dab1bC7EEAc9A2e3a',
  [CHAIN_IDS.BASE_MAINNET]: '0x0000000000000000000000000000000000000000',
}

export const ROOT_AUTHORITY =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const

export const USDC_DECIMALS = 6

export const ACTIVE_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? CHAIN_IDS.BASE_SEPOLIA
)

export const CONTRACTS = {
  GRANT_VAULT: (process.env.NEXT_PUBLIC_GRANT_VAULT ??
    '0xbbf3D2490c9f2a87a522214A51C98Fc355862092') as `0x${string}`,
  MILESTONE_REGISTRY: (process.env.NEXT_PUBLIC_MILESTONE_REGISTRY ??
    '0x037A6b35B64Dc42512BE95885D87b8d54349e346') as `0x${string}`,
  CAP_ENFORCER: (process.env.NEXT_PUBLIC_CAP_ENFORCER ??
    '0x2CA428434D5a53ce561E0B6198948ac82497bAf7') as `0x${string}`,
} as const