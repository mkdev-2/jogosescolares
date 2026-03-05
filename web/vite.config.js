import { createRequire } from 'module'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Garante que .env seja carregado em process.env antes do setupProxy
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      cors: true,
    },
    plugins: [
      react(),
      {
        name: 'setup-proxy',
        configureServer(server) {
          const setupProxy = require('./src/setupProxy.cjs')
          setupProxy(server.middlewares)
        },
      },
    ],
  }
})
