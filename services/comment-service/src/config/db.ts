import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Failed to disconnect from MongoDB:', error);
    throw error;
  }
}
