import { Comment, IComment } from '../models/Comment';
import { EventBus, EVENTS, QUEUES } from '@streamia/shared';

export class CommentService {
  private eventBus?: EventBus;

  /**
   * Initialize event bus and saga handlers
   */
  initializeEventBus(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupSagaHandlers();
  }

  /**
   * Setup Saga Pattern handlers for USER_DELETED and MOVIE_DELETED events
   */
  private async setupSagaHandlers() {
    if (!this.eventBus) return;

    try {
      // Handle USER_DELETED event - cleanup all comments by user
      await this.eventBus.subscribe(
        EVENTS.USER_DELETED,
        this.handleUserDeleted.bind(this),
        QUEUES.COMMENTS_USER_QUEUE
      );

      // Handle MOVIE_DELETED event - cleanup all comments for movie
      await this.eventBus.subscribe(
        EVENTS.MOVIE_DELETED,
        this.handleMovieDeleted.bind(this),
        QUEUES.COMMENTS_MOVIE_QUEUE
      );

      console.log('✅ [CommentService] Saga handlers initialized');
    } catch (error) {
      console.error('❌ [CommentService] Failed to setup saga handlers:', error);
    }
  }

  /**
   * Saga Handler: Delete all comments when user is deleted
   */
  private async handleUserDeleted(event: any): Promise<void> {
    try {
      const { userId } = event.payload;
      console.log(`🔄 [SAGA] Handling USER_DELETED for userId: ${userId}`);

      const result = await Comment.deleteMany({ userId });
      console.log(`✅ [SAGA] Deleted ${result.deletedCount} comments for user ${userId}`);

      // Optionally publish event for tracking
      if (this.eventBus && result.deletedCount > 0) {
        await this.eventBus.publish(EVENTS.COMMENTS_CLEARED_FOR_USER, {
          userId,
          count: result.deletedCount
        });
      }
    } catch (error) {
      console.error('❌ [SAGA] Error handling USER_DELETED:', error);
      // In a production system, implement compensation logic here
    }
  }

  /**
   * Saga Handler: Delete all comments when movie is deleted
   */
  private async handleMovieDeleted(event: any): Promise<void> {
    try {
      const { movieId } = event.payload;
      console.log(`🔄 [SAGA] Handling MOVIE_DELETED for movieId: ${movieId}`);

      const result = await Comment.deleteMany({ movieId });
      console.log(`✅ [SAGA] Deleted ${result.deletedCount} comments for movie ${movieId}`);

      // Optionally publish event for tracking
      if (this.eventBus && result.deletedCount > 0) {
        await this.eventBus.publish(EVENTS.COMMENTS_CLEARED_FOR_MOVIE, {
          movieId,
          count: result.deletedCount
        });
      }
    } catch (error) {
      console.error('❌ [SAGA] Error handling MOVIE_DELETED:', error);
      // In a production system, implement compensation logic here
    }
  }

  /**
   * Create a new comment
   */
  async createComment(userId: string, movieId: string, text: string): Promise<IComment> {
    try {
      const comment = new Comment({
        movieId,
        userId,
        text,
      });

      await comment.save();

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish(EVENTS.COMMENT_CREATED, {
          commentId: comment._id.toString(),
          userId,
          movieId,
          text
        });
      }

      return comment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, text: string): Promise<IComment | null> {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new Error('Unauthorized to update this comment');
      }

      comment.text = text;
      await comment.save();

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish(EVENTS.COMMENT_UPDATED, {
          commentId: comment._id.toString(),
          userId,
          movieId: comment.movieId,
          text
        });
      }

      return comment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new Error('Unauthorized to delete this comment');
      }

      await Comment.findByIdAndDelete(commentId);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish(EVENTS.COMMENT_DELETED, {
          commentId: comment._id.toString(),
          userId,
          movieId: comment.movieId
        });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comments for a movie
   */
  async getCommentsByMovie(movieId: string, page: number = 1, limit: number = 10): Promise<{ comments: IComment[], total: number, pages: number }> {
    try {
      const skip = (page - 1) * limit;

      const comments = await Comment.find({ movieId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Comment.countDocuments({ movieId });

      return {
        comments,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId: string): Promise<IComment | null> {
    try {
      return await Comment.findById(commentId);
    } catch (error) {
      throw error;
    }
  }
}
