const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorMiddleware;
