import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  movieId: string;
  userId: string;
  text: string;
  username?: string;
  rating?: number;
  likes?: number;
  replies?: mongoose.Types.ObjectId[];
  parentCommentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    movieId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    username: String,
    rating: Number,
    likes: { type: Number, default: 0 },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  },
  { timestamps: true, collection: 'comments' }
);

// Delete model if it exists to ensure clean registration
if (mongoose.models['Comment']) {
  delete mongoose.models['Comment'];
}

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export { Comment };



