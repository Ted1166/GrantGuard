export const GRANT_VAULT_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_owner', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'fundGrant',
    inputs: [
      { name: 'grantId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'availableBalance',
    inputs: [{ name: 'grantId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'grantAllocation',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'grantPaid',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalAllocated',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'GrantFunded',
    inputs: [
      { name: 'grantId', type: 'bytes32', indexed: true },
      { name: 'funder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestonePaid',
    inputs: [
      { name: 'grantId', type: 'bytes32', indexed: true },
      { name: 'milestoneId', type: 'bytes32', indexed: true },
      { name: 'recipient', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const

export const MILESTONE_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'createGrant',
    inputs: [
      { name: 'grantId', type: 'bytes32' },
      { name: 'title', type: 'string' },
      { name: 'totalBudget', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'addMilestone',
    inputs: [
      { name: 'grantId', type: 'bytes32' },
      { name: 'milestoneId', type: 'bytes32' },
      { name: 'builder', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitEvidence',
    inputs: [
      { name: 'milestoneId', type: 'bytes32' },
      { name: 'evidenceCid', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getMilestone',
    inputs: [{ name: 'milestoneId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'grantId', type: 'bytes32' },
          { name: 'milestoneId', type: 'bytes32' },
          { name: 'builder', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'evidenceCid', type: 'string' },
          { name: 'reviewNotes', type: 'string' },
          { name: 'status', type: 'uint8' },
          { name: 'submittedAt', type: 'uint256' },
          { name: 'reviewedAt', type: 'uint256' },
          { name: 'paidAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMilestoneStatus',
    inputs: [{ name: 'milestoneId', type: 'bytes32' }],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGrantMilestones',
    inputs: [{ name: 'grantId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'grants',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'grantId', type: 'bytes32' },
      { name: 'title', type: 'string' },
      { name: 'committee', type: 'address' },
      { name: 'totalBudget', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'GrantCreated',
    inputs: [
      { name: 'grantId', type: 'bytes32', indexed: true },
      { name: 'title', type: 'string', indexed: false },
      { name: 'committee', type: 'address', indexed: false },
      { name: 'totalBudget', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneCreated',
    inputs: [
      { name: 'grantId', type: 'bytes32', indexed: true },
      { name: 'milestoneId', type: 'bytes32', indexed: true },
      { name: 'builder', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneSubmitted',
    inputs: [
      { name: 'milestoneId', type: 'bytes32', indexed: true },
      { name: 'evidenceCid', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneApproved',
    inputs: [
      { name: 'milestoneId', type: 'bytes32', indexed: true },
      { name: 'reviewNotes', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestonePaid',
    inputs: [
      { name: 'milestoneId', type: 'bytes32', indexed: true },
      { name: 'builder', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'executePayout',
    inputs: [{ name: 'milestoneId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'markUnderReview',
    inputs: [{ name: 'milestoneId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveMilestone',
    inputs: [
      { name: 'milestoneId', type: 'bytes32' },
      { name: 'reviewNotes', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'rejectMilestone',
    inputs: [
      { name: 'milestoneId', type: 'bytes32' },
      { name: 'reviewNotes', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const