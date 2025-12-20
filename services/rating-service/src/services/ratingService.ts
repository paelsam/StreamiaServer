import Rating, { IRating } from "../models/Rating";
import {
  publishRatingCreated,
  publishRatingUpdated,
  publishRatingDeleted
} from "../events/publisher";
import { EventBus, EVENTS, QUEUES } from '@streamia/shared';

export class RatingService {
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
      // Handle USER_DELETED event - cleanup all ratings by user
      await this.eventBus.subscribe(
        EVENTS.USER_DELETED,
        this.handleUserDeleted.bind(this),
        QUEUES.RATINGS_USER_QUEUE
      );

      // Handle MOVIE_DELETED event - cleanup all ratings for movie
      await this.eventBus.subscribe(
        EVENTS.MOVIE_DELETED,
        this.handleMovieDeleted.bind(this),
        QUEUES.RATINGS_MOVIE_QUEUE
      );

      console.log('✅ [RatingService] Saga handlers initialized');
    } catch (error) {
      console.error('❌ [RatingService] Failed to setup saga handlers:', error);
    }
  }

  /**
   * Saga Handler: Delete all ratings when user is deleted
   */
  private async handleUserDeleted(event: any): Promise<void> {
    try {
      const { userId } = event.payload;
      console.log(`🔄 [SAGA] Handling USER_DELETED for userId: ${userId}`);

      const result = await Rating.deleteMany({ userId });
      console.log(`✅ [SAGA] Deleted ${result.deletedCount} ratings for user ${userId}`);

      // Optionally publish event for tracking
      if (this.eventBus && result.deletedCount > 0) {
        await this.eventBus.publish(EVENTS.RATINGS_CLEARED_FOR_USER, {
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
   * Saga Handler: Delete all ratings when movie is deleted
   */
  private async handleMovieDeleted(event: any): Promise<void> {
    try {
      const { movieId } = event.payload;
      console.log(`🔄 [SAGA] Handling MOVIE_DELETED for movieId: ${movieId}`);

      const result = await Rating.deleteMany({ movieId });
      console.log(`✅ [SAGA] Deleted ${result.deletedCount} ratings for movie ${movieId}`);

      // Optionally publish event for tracking
      if (this.eventBus && result.deletedCount > 0) {
        await this.eventBus.publish(EVENTS.RATINGS_CLEARED_FOR_MOVIE, {
          movieId,
          count: result.deletedCount
        });
      }
    } catch (error) {
      console.error('❌ [SAGA] Error handling MOVIE_DELETED:', error);
      // In a production system, implement compensation logic here
    }
  }
  static async createOrUpdate(userId: string, movieId: string, score: number) {
    const existing = await Rating.findOne({ userId, movieId });

    if (existing) {
      const previousScore = existing.score;
      existing.score = score;
      await existing.save();

      await publishRatingUpdated(
        userId,
        movieId,
        score,
        previousScore
      );

      return existing;
    }

    const rating = await Rating.create({ userId, movieId, score });

    await publishRatingCreated(userId, movieId, score);

    return rating;
  }

  static async delete(userId: string, movieId: string) {
    const rating = await Rating.findOneAndDelete({ userId, movieId });

    if (rating) {
      await publishRatingDeleted(
        userId,
        movieId,
        rating.score
      );
    }
  }

  static async getUserRatings(userId: string) {
    return Rating.find({ userId });
  }

  static async getMovieStats(movieId: string) {
    const ratings = await Rating.find({ movieId });
    const total = ratings.length;
    const average =
      total === 0
        ? 0
        : ratings.reduce(
            (sum: number, r: IRating) => sum + r.score,
            0
          ) / total;

    return { total, average };
  }
}