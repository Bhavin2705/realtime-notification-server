jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const errorMiddleware = require('../../src/middlewares/error.middleware');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('errorMiddleware', () => {
  it('should return 500 for generic errors', () => {
    const err = new Error('Something broke');
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something broke',
    });
  });

  it('should use custom statusCode if set on error', () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not found',
    });
  });

  it('should log the error with stack trace', () => {
    const err = new Error('DB connection failed');
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorMiddleware(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith('DB connection failed', { stack: err.stack });
  });

  it('should fallback to default message when error has no message', () => {
    const err = new Error();
    err.message = '';
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorMiddleware(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error',
    });
  });
});
