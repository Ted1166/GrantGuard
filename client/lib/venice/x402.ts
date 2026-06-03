import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from '@/config/chains'

export interface X402PaymentRequired {
  accepts: Array<{
    scheme: string
    network: string
    maxAmountRequired: string
    resource: string
    description: string
    mimeType: string
    payTo: string
    maxTimeoutSeconds: number
    asset: string
    extra?: Record<string, string>
  }>
  error: string
}

export async function handleX402Payment(
  paymentRequired: X402PaymentRequired,
  payerPrivateKey: `0x${string}`
): Promise<Record<string, string>> {
  const accept = paymentRequired.accepts.find(
    (a) => a.scheme === 'exact' && a.network === 'base-sepolia'
  )

  if (!accept) {
    throw new Error('No compatible x402 payment scheme found')
  }

  const account = privateKeyToAccount(payerPrivateKey)
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  })

  const signature = await walletClient.signMessage({
    message: JSON.stringify({
      scheme: accept.scheme,
      network: accept.network,
      resource: accept.resource,
      payTo: accept.payTo,
      maxAmount: accept.maxAmountRequired,
      asset: accept.asset,
      timestamp: Math.floor(Date.now() / 1000),
    }),
  })

  return {
    'X-PAYMENT': JSON.stringify({
      scheme: accept.scheme,
      network: accept.network,
      payload: {
        signature,
        from: account.address,
        maxAmount: accept.maxAmountRequired,
        asset: accept.asset,
        payTo: accept.payTo,
      },
    }),
  }
}

export async function fetchWithX402(
  url: string,
  options: RequestInit,
  payerPrivateKey?: `0x${string}`
): Promise<Response> {
  const response = await fetch(url, options)

  if (response.status === 402 && payerPrivateKey) {
    const paymentRequired: X402PaymentRequired = await response.json()
    const paymentHeaders = await handleX402Payment(paymentRequired, payerPrivateKey)

    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        ...paymentHeaders,
      },
    })
  }

  return response
}