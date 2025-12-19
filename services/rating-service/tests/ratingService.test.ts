import Rating from "../src/models/Rating";
import { RatingService } from "../src/services/ratingService";
import * as publisher from "../src/events/publisher";

jest.mock("../src/models/Rating");
jest.mock("../src/events/publisher");

describe("RatingService", () => {
  const userId = "user1";
  const movieId = "movie1";

  describe("createOrUpdate", () => {
    it("creates a new rating and publishes rating.created", async () => {
      (Rating.findOne as jest.Mock).mockResolvedValue(null);
      (Rating.create as jest.Mock).mockResolvedValue({
        userId,
        movieId,
        score: 5
      });

      await RatingService.createOrUpdate(userId, movieId, 5);

      expect(Rating.create).toHaveBeenCalledWith({
        userId,
        movieId,
        score: 5
      });

      expect(publisher.publishRatingCreated).toHaveBeenCalledWith(
        userId,
        movieId,
        5
      );
    });

    it("updates an existing rating and publishes rating.updated", async () => {
      const save = jest.fn();

      (Rating.findOne as jest.Mock).mockResolvedValue({
        score: 3,
        save
      });

      await RatingService.createOrUpdate(userId, movieId, 4);

      expect(save).toHaveBeenCalled();
      expect(publisher.publishRatingUpdated).toHaveBeenCalledWith(
        userId,
        movieId,
        4,
        3
      );
    });
  });

  describe("delete", () => {
    it("deletes rating and publishes rating.deleted", async () => {
      (Rating.findOneAndDelete as jest.Mock).mockResolvedValue({
        score: 4
      });

      await RatingService.delete(userId, movieId);

      expect(publisher.publishRatingDeleted).toHaveBeenCalledWith(
        userId,
        movieId,
        4
      );
    });

    it("does nothing if rating does not exist", async () => {
      (Rating.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await RatingService.delete(userId, movieId);

      expect(publisher.publishRatingDeleted).not.toHaveBeenCalled();
    });
  });

  describe("getMovieStats", () => {
    it("returns total and average", async () => {
      (Rating.find as jest.Mock).mockResolvedValue([
        { score: 4 },
        { score: 5 }
      ]);

      const stats = await RatingService.getMovieStats(movieId);

      expect(stats).toEqual({
        total: 2,
        average: 4.5
      });
    });

    it("returns zero stats when no ratings", async () => {
      (Rating.find as jest.Mock).mockResolvedValue([]);

      const stats = await RatingService.getMovieStats(movieId);

      expect(stats).toEqual({
        total: 0,
        average: 0
      });
    });
  });
});