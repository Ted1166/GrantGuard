'use client'

import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { baseSepolia, baseMainnet } from './chains'

export const wagmiConfig = createConfig({
  chains: [baseSepolia, baseMainnet],
  connectors: [
    injected({ target: 'metaMask' }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [baseMainnet.id]: http('https://mainnet.base.org'),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}