import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  try {
    console.log('🔌 [DB] Connecting to MongoDB...');
    console.log(`🔌 [DB] URI: ${config.mongoUri.substring(0, 60)}...`);
    
    await mongoose.connect(config.mongoUri);
    console.log('✅ [DB] Connected to MongoDB');
  } catch (error) {
    console.error('❌ [DB] Failed to connect to MongoDB:', error);
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
