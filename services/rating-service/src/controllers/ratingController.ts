import { Request, Response } from "express";
import { RatingService } from "../services/ratingService";

export const rateMovie = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { movieId } = req.params;
  const { score } = req.body;

  if (!userId || !score || score < 1 || score > 5) {
    return res.status(400).json({ message: "Invalid rating data" });
  }

  const rating = await RatingService.createOrUpdate(
    userId,
    movieId,
    score
  );

  res.status(200).json(rating);
};

export const deleteRating = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { movieId } = req.params;

  await RatingService.delete(userId, movieId);
  res.status(204).send();
};

export const getUserRatings = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const ratings = await RatingService.getUserRatings(userId);
  res.json(ratings);
};

export const getMovieStats = async (req: Request, res: Response) => {
  const { movieId } = req.params;
  const stats = await RatingService.getMovieStats(movieId);
  res.json(stats);
};