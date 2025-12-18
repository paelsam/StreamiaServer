import Rating, { IRating } from "../models/Rating";
import {
  publishRatingCreated,
  publishRatingUpdated,
  publishRatingDeleted
} from "../events/publisher";

export class RatingService {
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