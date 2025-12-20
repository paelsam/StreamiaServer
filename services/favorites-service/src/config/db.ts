import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI_FAVORITES || process.env.MONGODB_URI;

  if (!uri) {
    console.warn("⚠️ MONGODB_URI_FAVORITES not set.");
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;