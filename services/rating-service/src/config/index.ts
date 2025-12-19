import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3004,
  mongoUri: process.env.MONGODB_URI!,
  rabbitmqUrl: process.env.RABBITMQ_URL!
};