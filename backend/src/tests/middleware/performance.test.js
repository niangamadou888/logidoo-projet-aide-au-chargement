const performanceTracker = require('../../middleware/performance');

// Mock the logger
jest.mock('../../config/logger', () => ({
  perfLogger: {
    debug: jest.fn()
  }
}));

const { perfLogger } = require('../../config/logger');

describe('Performance Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Test-Agent';
        return null;
      })
    };

    mockRes = {
      send: jest.fn()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it('should add requestId to request object', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    expect(mockReq.requestId).toBeDefined();
    expect(typeof mockReq.requestId).toBe('string');
  });

  it('should call next middleware', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should log request start', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    expect(perfLogger.debug).toHaveBeenCalled();
    expect(perfLogger.debug.mock.calls[0][0]).toContain('Début de la requête');
    expect(perfLogger.debug.mock.calls[0][0]).toContain('GET');
    expect(perfLogger.debug.mock.calls[0][0]).toContain('/api/test');
  });

  it('should log request metadata', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    const logCall = perfLogger.debug.mock.calls[0];
    const metadata = logCall[1];

    expect(metadata).toBeDefined();
    expect(metadata.requestId).toBeDefined();
    expect(metadata.method).toBe('GET');
    expect(metadata.url).toBe('/api/test');
    expect(metadata.ip).toBe('127.0.0.1');
    expect(metadata.userAgent).toBe('Test-Agent');
  });

  it('should wrap res.send to track response time', () => {
    const originalSend = mockRes.send;

    performanceTracker(mockReq, mockRes, mockNext);

    expect(mockRes.send).not.toBe(originalSend);
    expect(typeof mockRes.send).toBe('function');
  });

  it('should log response time when res.send is called', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    // Clear the initial log
    perfLogger.debug.mockClear();

    // Simulate response
    mockRes.send('test response');

    expect(perfLogger.debug).toHaveBeenCalled();
    expect(perfLogger.debug.mock.calls[0][0]).toContain('Fin de la requête');
    expect(perfLogger.debug.mock.calls[0][0]).toContain('ms');
  });

  it('should log response metadata', () => {
    mockRes.statusCode = 200;
    performanceTracker(mockReq, mockRes, mockNext);

    perfLogger.debug.mockClear();

    mockRes.send('test response body');

    const logCall = perfLogger.debug.mock.calls[0];
    const metadata = logCall[1];

    expect(metadata.statusCode).toBe(200);
    expect(metadata.responseTime).toBeDefined();
    expect(metadata.memoryUsage).toBeDefined();
    expect(parseFloat(metadata.responseTime)).toBeGreaterThanOrEqual(0);
  });

  it('should call original send function', () => {
    const testBody = { data: 'test' };

    // Save reference to original mock
    const originalMockSend = mockRes.send;

    performanceTracker(mockReq, mockRes, mockNext);

    // After middleware wraps it, call the wrapped version
    mockRes.send(testBody);

    // Verify the original mock was called
    expect(originalMockSend).toHaveBeenCalledWith(testBody);
  });

  it('should measure elapsed time in milliseconds', (done) => {
    performanceTracker(mockReq, mockRes, mockNext);

    perfLogger.debug.mockClear();

    setTimeout(() => {
      mockRes.send('delayed response');

      const logCall = perfLogger.debug.mock.calls[0];
      const metadata = logCall[1];
      const responseTime = parseFloat(metadata.responseTime);

      expect(responseTime).toBeGreaterThan(0);
      expect(responseTime).toBeGreaterThanOrEqual(5); // At least 5ms due to setTimeout
      done();
    }, 10);
  });

  it('should handle different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach(method => {
      jest.clearAllMocks();
      mockReq.method = method;

      performanceTracker(mockReq, mockRes, mockNext);

      expect(perfLogger.debug.mock.calls[0][0]).toContain(method);
    });
  });

  it('should handle different URLs', () => {
    const urls = ['/api/users', '/api/posts/123', '/auth/login'];

    urls.forEach(url => {
      jest.clearAllMocks();
      mockReq.originalUrl = url;

      performanceTracker(mockReq, mockRes, mockNext);

      expect(perfLogger.debug.mock.calls[0][0]).toContain(url);
    });
  });

  it('should track memory usage', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    perfLogger.debug.mockClear();

    mockRes.send('test');

    const logCall = perfLogger.debug.mock.calls[0];
    const metadata = logCall[1];

    expect(metadata.memoryUsage).toBeDefined();
    expect(typeof metadata.memoryUsage).toBe('number');
    expect(metadata.memoryUsage).toBeGreaterThan(0);
  });

  it('should handle empty response body', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    perfLogger.debug.mockClear();

    mockRes.send();

    const logCall = perfLogger.debug.mock.calls[0];
    const metadata = logCall[1];

    expect(metadata.contentLength).toBe(0);
  });

  it('should track content length', () => {
    performanceTracker(mockReq, mockRes, mockNext);

    perfLogger.debug.mockClear();

    const body = 'test response body';
    mockRes.send(body);

    const logCall = perfLogger.debug.mock.calls[0];
    const metadata = logCall[1];

    expect(metadata.contentLength).toBe(body.length);
  });
});
