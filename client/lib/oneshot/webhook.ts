import { createVerify } from 'crypto'

export function verifyWebhookSignature(
  payload: Buffer | string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verifier = createVerify('ed25519')
    verifier.update(typeof payload === 'string' ? Buffer.from(payload) : payload)
    return verifier.verify(
      { key: publicKey, format: 'der', type: 'spki' },
      Buffer.from(signature.replace('0x', ''), 'hex')
    )
  } catch {
    return false
  }
}

export interface OneShotWebhookPayload {
  taskId: string
  status: 'confirmed' | 'failed'
  txHash?: string
  chainId: number
  error?: string
  timestamp: number
}

export function parseWebhookPayload(body: string): OneShotWebhookPayload {
  const parsed = JSON.parse(body)
  if (!parsed.taskId || !parsed.status) {
    throw new Error('Invalid 1Shot webhook payload: missing taskId or status')
  }
  return parsed as OneShotWebhookPayload
}