import { Router } from "express";
import {
  rateMovie,
  deleteRating,
  getUserRatings,
  getMovieStats
} from "../controllers/ratingController";

const router = Router();

router.post("/:movieId", rateMovie);
router.delete("/:movieId", deleteRating);
router.get("/user/history", getUserRatings);
router.get("/movie/:movieId/stats", getMovieStats);

export default router;