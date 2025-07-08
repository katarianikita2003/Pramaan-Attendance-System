// backend/src/middleware/logger.middleware.js
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    user: req.user?.id
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    res.send(data);
    
    const duration = Date.now() - start;
    
    // Log response
    logger.info({
      type: 'response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id
    });
  };

  next();
};

// Skip logging for certain paths
export const skipPaths = ['/health', '/favicon.ico'];

export default requestLogger;