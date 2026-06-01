const ONESHOT_RPC = process.env.ONESHOT_RPC_URL ?? 'https://relayer.1shotapi.com/relayers'

let _requestId = 1

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(ONESHOT_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: _requestId++,
      method,
      params,
    }),
  })

  if (!response.ok) {
    throw new Error(`1Shot HTTP ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`1Shot RPC error ${data.error.code}: ${data.error.message}`)
  }

  return data.result as T
}

export interface OneShotCapabilities {
  supportedTokens: Array<{ address: string; symbol: string; decimals: number }>
  supportedChains: number[]
}

export async function getCapabilities(): Promise<OneShotCapabilities> {
  return rpc<OneShotCapabilities>('relayer_getCapabilities', [])
}

export interface FeeData {
  feeToken: string
  feeAmount: string
  estimatedGas: string
}

export async function getFeeData(chainId: number): Promise<FeeData> {
  return rpc<FeeData>('relayer_getFeeData', [{ chainId }])
}

export interface Send7710Params {
  chainId: number
  delegations: unknown[]
  execution: {
    target: string
    value: string
    callData: string
  }
  feeToken: string
  webhookUrl?: string
}

export interface Send7710Result {
  taskId: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
}

export async function send7710Transaction(
  params: Send7710Params
): Promise<Send7710Result> {
  return rpc<Send7710Result>('relayer_send7710Transaction', [params])
}

export interface TaskStatus {
  taskId: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
  error?: string
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  return rpc<TaskStatus>('relayer_getTaskStatus', [{ taskId }])
}

export async function waitForTask(
  taskId: string,
  maxWait = 120_000,
  interval = 3_000
): Promise<TaskStatus> {
  const deadline = Date.now() + maxWait

  while (Date.now() < deadline) {
    const status = await getTaskStatus(taskId)
    if (status.status === 'confirmed' || status.status === 'failed') {
      return status
    }
    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(`1Shot task ${taskId} timed out after ${maxWait}ms`)
}