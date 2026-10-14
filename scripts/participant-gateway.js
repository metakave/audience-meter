/**
 * AudienceMeter Participant Gateway
 * Runs on Port 3001 and proxies to Next.js on Port 3000.
 *
 * Benefits:
 * 1. Provides a dedicated participant URL on port 3001 (e.g. http://localhost:3001)
 *    while the Presenter / Admin runs on port 3000 (e.g. http://localhost:3000).
 * 2. Separate browser origin = separate localStorage sandbox so you can test as
 *    both Presenter and Participant simultaneously in the same browser!
 * 3. Visiting http://localhost:3001/ automatically redirects to /join for instant onboarding.
 * 4. 100% shared real-time state with sub-millisecond sync.
 */

const http = require('http');

const TARGET_HOST = 'localhost';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '3000', 10);
const GATEWAY_PORT = parseInt(process.env.PORT || '3001', 10);

const server = http.createServer((req, res) => {
  // If participant lands on root of port 3001, redirect directly to /join
  if (req.url === '/' || req.url === '') {
    res.writeHead(302, { Location: '/join' });
    res.end();
    return;
  }

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${TARGET_HOST}:${TARGET_PORT}`,
      'x-forwarded-host': req.headers.host || `localhost:${GATEWAY_PORT}`,
      'x-forwarded-port': GATEWAY_PORT.toString(),
      'x-forwarded-proto': 'http',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Gateway Proxy Error] Target port ${TARGET_PORT} unreachable:`, err.message);
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <body style="font-family: sans-serif; background: #0a0c10; color: #f8fafc; padding: 40px; text-align: center;">
          <h2>Participant Gateway (Port ${GATEWAY_PORT})</h2>
          <p style="color: #94a3b8;">Waiting for main Next.js server on port ${TARGET_PORT} to start...</p>
        </body>
      </html>
    `);
  });

  req.pipe(proxyReq, { end: true });
});

// Support WebSocket Upgrade (for Next.js HMR and live updates)
server.on('upgrade', (req, socket, head) => {
  const proxyReq = http.request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${TARGET_HOST}:${TARGET_PORT}`,
    },
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.keys(proxyRes.headers)
        .map((h) => `${h}: ${proxyRes.headers[h]}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.destroy();
  });

  proxyReq.end();
});

server.listen(GATEWAY_PORT, () => {
  console.log(`\n⚡ AudienceMeter Dual-Port Ready!`);
  console.log(`👉 Presenter & Admin Screen: http://localhost:${TARGET_PORT}/present/824915`);
  console.log(`👉 Participant Screen:       http://localhost:${GATEWAY_PORT}/join\n`);
});
