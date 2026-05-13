import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  const isDev = mode === 'development'

  // Mesmos fallbacks de setupProxy.cjs (proxy nativo do Vite roda antes do SPA e evita
  // GET de imagens/arquivos receberem index.html por engano).
  // Padrão: stack local (docker-compose em api-jels). Em deploy remoto, defina VITE_* no build.
  const apiServiceUrl =
    env.VITE_API_SERVICE_URL?.trim() || 'http://localhost:8000'
  const postgrestUrl =
    env.VITE_POSTGREST_URL?.trim() || 'http://localhost:3001'
  const minioUrl =
    env.VITE_MINIO_URL?.trim() || 'http://localhost:9000'

  if (isDev) {
    console.log('[vite proxy] Targets:', { apiServiceUrl, postgrestUrl, minioUrl })
  }

  const postgrestProxyTimeout = isDev ? 300000 : 60000

  return {
    server: {
      host: '0.0.0.0',
      port: 5173,
      cors: true,
      proxy: {
        '/api-service': {
          target: apiServiceUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-service/, ''),
          timeout: 60000,
          proxyTimeout: 60000,
        },
        '/api-postgrest': {
          target: postgrestUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-postgrest/, ''),
          timeout: postgrestProxyTimeout,
          proxyTimeout: postgrestProxyTimeout,
        },
        '/minio': {
          target: minioUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/minio/, ''),
          timeout: 60000,
          proxyTimeout: 60000,
        },
      },
    },
    plugins: [react()],
  }
})
