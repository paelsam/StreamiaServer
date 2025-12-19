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

      console.log(`\n📥 [getCommentsByMovie] Request:`);
      console.log(`   movieId: ${movieId}`);
      console.log(`   page: ${page}, limit: ${limit}`);

      const skip = (Number(page) - 1) * Number(limit);

      const query = { movieId };
      console.log(`   Query object:`, query);

      const comments = await Comment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      console.log(`   ✅ Found ${comments.length} comments`);
      if (comments.length > 0) {
        console.log(`   Sample:`, JSON.stringify(comments[0], null, 2).substring(0, 200));
      }

      const total = await Comment.countDocuments(query);
      console.log(`   Total count: ${total}\n`);

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
      console.error('❌ [getCommentsByMovie] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments',
      });
    }
  }

  /**
   * Get a single comment by ID
   */
  static async getCommentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);

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
      const { movieId, text } = req.body;
      const userId = req.userId!;

      if (!movieId || !text) {
        res.status(400).json({
          success: false,
          error: 'movieId and text are required',
        });
        return;
      }

      const comment = new Comment({
        movieId,
        userId,
        text,
      });

      await comment.save();

      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
  }

  /**
   * Update a comment
   */
  static async updateComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const { text } = req.body;
      const userId = req.userId!;

      const comment = await Comment.findById(commentId);

      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' });
        return;
      }

      if (comment.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to update this comment',
        });
        return;
      }

      if (text) comment.text = text;

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
        res.status(403).json({
          success: false,
          error: 'Unauthorized to delete this comment',
        });
        return;
      }

      await Comment.findByIdAndDelete(commentId);

      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  }

  
}