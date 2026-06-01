export interface SignedDelegation {
  delegate: string
  delegator: string
  authority: string
  caveats: Caveat[]
  salt: string
  signature: string
}

export interface Caveat {
  enforcer: string
  terms: string
  args: string
}

export interface RedelegationChain {
  reviewerDelegation: SignedDelegation
  distributorDelegation: SignedDelegation
  auditorDelegation: SignedDelegation
}

export interface PermissionsContext {
  signer: string
  chainId: number
  permissions: ERC7715Permission[]
}

export interface ERC7715Permission {
  type: string
  data: Record<string, unknown>
}