const { logger } = require('@librechat/data-schemas');

function setHeaders(req, res, next) {
  const domainClient = process.env.DOMAIN_CLIENT;
  let origin;

  if (domainClient) {
    const requestOrigin = req.headers.origin;
    origin = requestOrigin === domainClient ? requestOrigin : domainClient;
  } else {
    origin = req.headers.origin || '';
    if (origin) {
      logger.warn(
        '[setHeaders] DOMAIN_CLIENT is not set; using request origin for Access-Control-Allow-Origin. Set DOMAIN_CLIENT in production.',
      );
    }
  }

  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Access-Control-Allow-Origin': origin,
    'X-Accel-Buffering': 'no',
  });
  next();
}

module.exports = setHeaders;
