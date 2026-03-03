/**
 * Configuração de Proxy para desenvolvimento
 * Redireciona requisições para API Service e PostgREST durante desenvolvimento
 * Isso evita problemas de CORS em desenvolvimento local
 *
 * Arquivo .cjs para compatibilidade com projeto ESM (type: module)
 */

const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // IMPORTANTE: Em desenvolvimento, o proxy SEMPRE é usado para evitar CORS
  // As variáveis de ambiente definem para onde o proxy redireciona (target)
  // O código cliente sempre usa /api-service e /api-postgrest em desenvolvimento
  const isDevelopment = process.env.NODE_ENV === "development";

  // URLs de destino do proxy (usando variáveis de ambiente ou fallback)
  // Estas URLs são usadas como target do proxy, não pelo código cliente
  // Em desenvolvimento, usa localhost se não houver variável de ambiente
  const apiServiceUrl = process.env.VITE_API_SERVICE_URL || (isDevelopment ? "http://localhost:8000" : "https://auth-jels.criativesoftware.com.br");
  const postgrestUrl = process.env.VITE_POSTGREST_URL || (isDevelopment ? "http://localhost:3001" : "https://api-jels.criativesoftware.com.br");
  const minioUrl = process.env.VITE_MINIO_URL || (isDevelopment ? "http://localhost:9000" : "https://storage-jels.criativesoftware.com.br");

  console.log("[setupProxy] Targets:", { apiServiceUrl, postgrestUrl, minioUrl });

  // Proxy para API Service (auth)
  app.use(
    "/api-service",
    createProxyMiddleware({
      target: apiServiceUrl,
      changeOrigin: true,
      secure: false, // Permite certificados auto-assinados em desenvolvimento
      pathRewrite: {
        "^/api-service": "", // Remove /api-service do path
      },
      logLevel: "debug",
      timeout: 60000, // Timeout de 60 segundos
      proxyTimeout: 60000, // Timeout do proxy de 60 segundos
      onProxyReq: (proxyReq, req, res) => {

      },
      onError: (err, req, res) => {
        console.error("[Proxy API Service Error]", err.message);
        if (!res.headersSent) {
          res.status(504).json({
            error: "Gateway Timeout",
            message: `Não foi possível conectar ao servidor backend em ${apiServiceUrl}. Verifique se o servidor está rodando.`,
            details: err.message,
          });
        }
      },
      onProxyRes: (proxyRes, req, res) => {

      },
    })
  );

  // Timeout estendido para PostgREST em desenvolvimento (consultas pesadas como limit=30000)
  const postgrestTimeout = isDevelopment ? 300000 : 60000; // 5 min local, 60s produção

  // Proxy para PostgREST (api)
  app.use(
    "/api-postgrest",
    createProxyMiddleware({
      target: postgrestUrl,
      changeOrigin: true,
      secure: false, // Permite certificados auto-assinados em desenvolvimento
      pathRewrite: {
        "^/api-postgrest": "", // Remove /api-postgrest do path
      },
      logLevel: "debug",
      timeout: postgrestTimeout,
      proxyTimeout: postgrestTimeout,
      onProxyReq: (proxyReq, req, res) => {

      },
      onError: (err, req, res) => {
        console.error("[Proxy PostgREST Error]", err.message);
        if (!res.headersSent) {
          res.status(504).json({
            error: "Gateway Timeout",
            message: `Não foi possível conectar ao PostgREST em ${postgrestUrl}. Verifique se o servidor está rodando.`,
            details: err.message,
          });
        }
      },
      onProxyRes: (proxyRes, req, res) => {

      },
    })
  );

  // Proxy para MinIO (Storage)
  app.use(
    "/minio",
    createProxyMiddleware({
      target: minioUrl,
      changeOrigin: true,
      secure: false, // Permite certificados auto-assinados em desenvolvimento
      pathRewrite: {
        "^/minio": "", // Remove /minio do path
      },
      logLevel: "debug",
      timeout: 60000, // Timeout de 60 segundos para uploads grandes
      proxyTimeout: 60000, // Timeout do proxy de 60 segundos
      onProxyReq: (proxyReq, req, res) => {

        // Adicionar headers necessários para MinIO (CORS)
        if (req.method === "OPTIONS") {
          proxyReq.setHeader("Access-Control-Allow-Origin", "*");
          proxyReq.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, HEAD, OPTIONS");
          proxyReq.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-amz-date, x-amz-content-sha256, x-amz-security-token");
        }
      },
      onError: (err, req, res) => {
        console.error("[Proxy MinIO Error]", err.message);
        if (!res.headersSent) {
          res.status(504).json({
            error: "Gateway Timeout",
            message: `Não foi possível conectar ao MinIO em ${minioUrl}. Verifique se o MinIO está rodando.`,
            details: err.message,
          });
        }
      },
      onProxyRes: (proxyRes, req, res) => {

        // Adicionar headers CORS na resposta
        proxyRes.headers["Access-Control-Allow-Origin"] = "*";
        proxyRes.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, HEAD, OPTIONS";
        proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-amz-date, x-amz-content-sha256, x-amz-security-token";
      },
    })
  );


};
