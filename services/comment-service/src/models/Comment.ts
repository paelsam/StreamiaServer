import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  movieId: string;
  userId: string;
  username: string;
  content: string;
  rating?: number;
  likes: number;
  replies: IComment[];
  parentCommentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    movieId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 500,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: undefined,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'Comment',
    },
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { __v, ...rest } = ret;
        return {
          id: ret._id.toString(),
          ...rest,
        };
      },
    },
  }
);

// Indexes for common queries
commentSchema.index({ movieId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
