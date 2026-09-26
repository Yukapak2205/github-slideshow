import type { NextConfig } from 'next'

const config: NextConfig = {
  // El paquete compartido se publica como TypeScript sin compilar.
  transpilePackages: ['@carezia/core'],
  experimental: {
    typedEnv: false,
  },
}

export default config
