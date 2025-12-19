import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'favorites-service' as const,
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/streamia_favorites',
  
  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'favorites-service-secret',
  
  // External services
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  movieServiceUrl: process.env.MOVIE_SERVICE_URL || 'http://movie-service:3002',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  
  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    defaultPage: 1
  }
};

export type Config = typeof config;