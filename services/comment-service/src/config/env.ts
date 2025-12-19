import path from 'path';

// Load ONLY from infrastructure/.env (centralized configuration)
require('dotenv').config({
  path: path.resolve(__dirname, '../../../infrastructure/.env'),
  override: true, // Override any existing variables
});

export const config = {
  port: Number(process.env.COMMENT_SERVICE_PORT || process.env.PORT) || 3005,
  mongoUri: process.env.MONGODB_URI_COMMENTS || process.env.MONGODB_URI || 'mongodb://streamia:streamia_secret@localhost:27017/streamia-comments?authSource=admin',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

