import { Response } from 'express';
import { Comment } from '../models/Comment';
import { AuthRequest } from '../middlewares';

export class CommentController {
  /**
   * Get all comments for a movie
   */
  static async getCommentsByMovie(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { movieId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const comments = await Comment.find({ movieId, parentCommentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('replies');

      const total = await Comment.countDocuments({ movieId, parentCommentId: null });

      res.json({
        success: true,
        data: comments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch comments', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Get a single comment with replies
   */
  static async getCommentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId).populate('replies');

      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch comment' });
    }
  }

  /**
   * Create a new comment
   */
  static async createComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { movieId, content, rating } = req.body;
      const userId = req.userId!;
      const username = req.username!;

      if (!movieId || !content) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      const comment = new Comment({
        movieId,
        userId,
        username,
        content,
        rating,
      });

      await comment.save();

      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
  }

  /**
   * Add a reply to a comment
   */
  static async addReply(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.userId!;
      const username = req.username!;

      const parentComment = await Comment.findById(commentId);

      if (!parentComment) {
        res.status(404).json({ success: false, error: 'Parent comment not found' });
        return;
      }

      const reply = new Comment({
        movieId: parentComment.movieId,
        userId,
        username,
        content,
        parentCommentId: commentId,
      });

      await reply.save();
      parentComment.replies.push(reply._id);
      await parentComment.save();

      res.status(201).json({ success: true, data: reply });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to add reply' });
    }
  }

  /**
   * Update a comment
   */
  static async updateComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const { content, rating } = req.body;
      const userId = req.userId!;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      if (comment.userId !== userId) {
        res.status(403).json({ success: false, error: 'Unauthorized to update this comment' });
        return;
      }

      if (content) comment.content = content;
      if (rating !== undefined) comment.rating = rating;

      await comment.save();

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update comment' });
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const userId = req.userId!;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      if (comment.userId !== userId) {
        res.status(403).json({ success: false, error: 'Unauthorized to delete this comment' });
        return;
      }

      // If it's a reply, remove it from parent comment
      if (comment.parentCommentId) {
        await Comment.findByIdAndUpdate(comment.parentCommentId, {
          $pull: { replies: commentId },
        });
      } else {
        // If it's a main comment, delete all its replies
        await Comment.deleteMany({ parentCommentId: commentId });
      }

      await Comment.findByIdAndDelete(commentId);

      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  }

  /**
   * Like a comment
   */
  static async likeComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;

      const comment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes: 1 } },
        { new: true }
      );

      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to like comment' });
    }
  }
}
