describe('Config Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default configuration values', () => {
    // Clear all environment variables
    process.env = {};
    
    const { config } = require('../src/config');

    expect(config.port).toBe(3003);
    expect(config.nodeEnv).toBe('development');
    expect(config.serviceName).toBe('favorites-service');
    expect(config.mongodbUri).toBe('mongodb://localhost:27017/streamia_favorites');
    expect(config.rabbitmqUrl).toBe('amqp://localhost:5672');
    expect(config.jwtSecret).toBe('favorites-service-secret');
    expect(config.userServiceUrl).toBe('http://user-service:3001');
    expect(config.movieServiceUrl).toBe('http://movie-service:3002');
    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.rateLimitWindow).toBe(900000);
    expect(config.rateLimitMax).toBe(100);
    expect(config.pagination.defaultLimit).toBe(20);
    expect(config.pagination.maxLimit).toBe(100);
    expect(config.pagination.defaultPage).toBe(1);
  });

  it('should load configuration from environment variables', () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI_FAVORITES = 'mongodb://prod:27017/favorites';
    process.env.RABBITMQ_URL = 'amqp://prod:5672';
    process.env.JWT_SECRET = 'production-secret';
    process.env.USER_SERVICE_URL = 'http://user-prod:3001';
    process.env.MOVIE_SERVICE_URL = 'http://movie-prod:3002';
    process.env.CORS_ORIGIN = 'https://production.com';
    process.env.RATE_LIMIT_WINDOW = '600000';
    process.env.RATE_LIMIT_MAX = '200';

    const { config } = require('../src/config');

    expect(config.port).toBe('4000');
    expect(config.nodeEnv).toBe('production');
    expect(config.mongodbUri).toBe('mongodb://prod:27017/favorites');
    expect(config.rabbitmqUrl).toBe('amqp://prod:5672');
    expect(config.jwtSecret).toBe('production-secret');
    expect(config.userServiceUrl).toBe('http://user-prod:3001');
    expect(config.movieServiceUrl).toBe('http://movie-prod:3002');
    expect(config.corsOrigin).toBe('https://production.com');
    expect(config.rateLimitWindow).toBe(600000);
    expect(config.rateLimitMax).toBe(200);
  });

  it('should fallback to MONGODB_URI if MONGODB_URI_FAVORITES is not set', () => {
    process.env.MONGODB_URI = 'mongodb://fallback:27017/streamia';
    delete process.env.MONGODB_URI_FAVORITES;

    const { config } = require('../src/config');

    expect(config.mongodbUri).toBe('mongodb://fallback:27017/streamia');
  });

  it('should prioritize MONGODB_URI_FAVORITES over MONGODB_URI', () => {
    process.env.MONGODB_URI = 'mongodb://fallback:27017/streamia';
    process.env.MONGODB_URI_FAVORITES = 'mongodb://specific:27017/favorites';

    const { config } = require('../src/config');

    expect(config.mongodbUri).toBe('mongodb://specific:27017/favorites');
  });

  it('should parse integer values correctly', () => {
    process.env.RATE_LIMIT_WINDOW = '1200000';
    process.env.RATE_LIMIT_MAX = '500';

    const { config } = require('../src/config');

    expect(config.rateLimitWindow).toBe(1200000);
    expect(config.rateLimitMax).toBe(500);
    expect(typeof config.rateLimitWindow).toBe('number');
    expect(typeof config.rateLimitMax).toBe('number');
  });

  it('should handle invalid integer values and use defaults', () => {
    process.env.RATE_LIMIT_WINDOW = 'invalid';
    process.env.RATE_LIMIT_MAX = 'not-a-number';

    const { config } = require('../src/config');

    expect(config.rateLimitWindow).toBeNaN();
    expect(config.rateLimitMax).toBeNaN();
  });

  it('should have correct pagination configuration', () => {
    const { config } = require('../src/config');

    expect(config.pagination).toBeDefined();
    expect(config.pagination.defaultLimit).toBe(20);
    expect(config.pagination.maxLimit).toBe(100);
    expect(config.pagination.defaultPage).toBe(1);
  });

  it('should have serviceName as a const value', () => {
    const { config } = require('../src/config');

    expect(config.serviceName).toBe('favorites-service');
  });

  it('should export Config type', () => {
    const configModule = require('../src/config');

    expect(configModule.config).toBeDefined();
    expect(typeof configModule.config).toBe('object');
  });

  it('should handle partial environment variable configuration', () => {
    process.env.PORT = '5000';
    process.env.JWT_SECRET = 'partial-secret';
    // Leave other env vars undefined

    const { config } = require('../src/config');

    expect(config.port).toBe('5000');
    expect(config.jwtSecret).toBe('partial-secret');
    // NODE_ENV is set to 'test' by Jest
    expect(config.nodeEnv).toBe('test');
    expect(config.rabbitmqUrl).toBe('amqp://localhost:5672');
  });

  it('should handle zero values for rate limit configuration', () => {
    process.env.RATE_LIMIT_WINDOW = '0';
    process.env.RATE_LIMIT_MAX = '0';

    const { config } = require('../src/config');

    expect(config.rateLimitWindow).toBe(0);
    expect(config.rateLimitMax).toBe(0);
  });

  it('should handle empty string environment variables', () => {
    process.env.PORT = '';
    process.env.NODE_ENV = '';

    const { config } = require('../src/config');

    // Empty strings are falsy, so defaults should be used
    expect(config.port).toBe(3003);
    expect(config.nodeEnv).toBe('development');
  });

  it('should maintain all required service URLs', () => {
    const { config } = require('../src/config');

    expect(config.userServiceUrl).toBeDefined();
    expect(config.movieServiceUrl).toBeDefined();
    expect(config.userServiceUrl).toMatch(/^http/);
    expect(config.movieServiceUrl).toMatch(/^http/);
  });

  it('should have valid default CORS origin', () => {
    const { config } = require('../src/config');

    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.corsOrigin).toMatch(/^http/);
  });

  it('should have valid default database connection string', () => {
    const { config } = require('../src/config');

    expect(config.mongodbUri).toMatch(/^mongodb:\/\//);
    expect(config.mongodbUri).toContain('streamia_favorites');
  });

  it('should have valid default RabbitMQ connection string', () => {
    const { config } = require('../src/config');

    expect(config.rabbitmqUrl).toMatch(/^amqp:\/\//);
  });
});
