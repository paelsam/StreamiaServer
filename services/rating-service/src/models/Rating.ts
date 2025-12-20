import mongoose, { Schema, Document } from "mongoose";

export interface IRating extends Document {
  userId: string;
  movieId: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    userId: { type: String, required: true, index: true },
    movieId: { type: String, required: true, index: true },
    score: { type: Number, required: true, min: 1, max: 5 }
  },
  { timestamps: true }
);

ratingSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<IRating>("Rating", ratingSchema);