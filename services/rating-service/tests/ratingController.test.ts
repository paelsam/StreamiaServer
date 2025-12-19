import request from "supertest";
import express from "express";
import ratingRouter from "../src/routes/ratingRoutes";
import { RatingService } from "../src/services/ratingService";

jest.mock("../src/services/ratingService");

const app = express();
app.use(express.json());
app.use("/ratings", ratingRouter);

describe("Rating Controller", () => {
  it("POST /ratings/:movieId creates rating", async () => {
    (RatingService.createOrUpdate as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post("/ratings/movie1")
      .set("x-user-id", "user1")
      .send({ score: 5 });

    expect(res.status).toBe(200);
    expect(RatingService.createOrUpdate).toHaveBeenCalledWith(
      "user1",
      "movie1",
      5
    );
  });

  it("GET /ratings/movie/:movieId/stats", async () => {
    (RatingService.getMovieStats as jest.Mock).mockResolvedValue({
      total: 1,
      average: 5
    });

    const res = await request(app).get(
      "/ratings/movie/movie1/stats"
    );

    expect(res.body).toEqual({
      total: 1,
      average: 5
    });
  });
});