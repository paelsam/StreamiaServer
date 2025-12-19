import { publishEvent } from "./eventBus";

export const publishRatingCreated = async (
  userId: string,
  movieId: string,
  score: number
) => {
  await publishEvent("rating.created", {
    userId,
    movieId,
    score
  });
};

export const publishRatingUpdated = async (
  userId: string,
  movieId: string,
  score: number,
  previousScore: number
) => {
  await publishEvent("rating.updated", {
    userId,
    movieId,
    score,
    previousScore
  });
};

export const publishRatingDeleted = async (
  userId: string,
  movieId: string,
  score: number
) => {
  await publishEvent("rating.deleted", {
    userId,
    movieId,
    score
  });
};