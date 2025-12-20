import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the service root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fallback: try loading from current working directory
if (!process.env.RABBITMQ_URL) {
  dotenv.config();
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'notification-service',

  // RabbitMQ (event consumer)
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://streamia:streamia@localhost:5672',

  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'apikey',
      pass: process.env.SMTP_PASS || '',
    },
  },

  // Email
  email: {
    from: process.env.EMAIL_FROM || 'noreply@streamia.com',
  },
} as const;

export type Config = typeof config;
