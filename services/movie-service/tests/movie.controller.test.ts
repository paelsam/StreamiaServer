import request from "supertest";
import express, { Application } from "express";
import { MovieController } from "../src/controllers/movieController";
import { MovieService } from "../src/services/movieService";
import { uploadMiddleware } from "../src/controllers/movieController";

jest.mock("../src/services/movieService");

jest.mock("@streamia/shared", () => {
  const actual = jest.requireActual("@streamia/shared");
  return {
    ...actual,
    EventBus: jest.fn().mockImplementation(() => ({
      subscribe: jest.fn(),
      publish: jest.fn()
    }))
  };
});

describe("Movie Controller", () => {
  let app: Application;
  let movieService: jest.Mocked<MovieService>;
  let movieController: MovieController;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    movieService = new MovieService({} as any) as jest.Mocked<MovieService>;
    movieController = new MovieController(movieService);

    // Setup routes
    app.post("/api/movies/upload", uploadMiddleware.single("video"), movieController.uploadMovie);
    app.post("/api/movies/:id/subtitles", uploadMiddleware.single("subtitle"), movieController.uploadSubtitles);
    app.get("/api/movies", movieController.getMovies);
    app.get("/api/movies/:id", movieController.getMovieById);
    app.put("/api/movies/:id", movieController.updateMovie);
    app.delete("/api/movies/:id", movieController.deleteMovie);

    jest.clearAllMocks();
  });


  it("GET /api/movies - returns all movies", async () => {
    const mockMovies = [
      { _id: "1", title: "Movie 1" },
      { _id: "2", title: "Movie 2" }
    ];

    movieService.getMovies = jest.fn().mockResolvedValue(mockMovies);

    const res = await request(app).get("/api/movies");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockMovies);
  });

  it("GET /api/movies/:id - returns movie by id", async () => {
    const mockMovie = { _id: "movie123", title: "Test Movie" };

    movieService.getMovieById = jest.fn().mockResolvedValue(mockMovie);

    const res = await request(app).get("/api/movies/movie123");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockMovie);
  });

  it("PUT /api/movies/:id - updates movie", async () => {
    const updatedMovie = { _id: "movie123", title: "Updated" };

    movieService.updateMovie = jest.fn().mockResolvedValue(updatedMovie);

    const res = await request(app)
      .put("/api/movies/movie123")
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(movieService.updateMovie).toHaveBeenCalledWith("movie123", { title: "Updated" });
  });

  it("DELETE /api/movies/:id - deletes movie", async () => {
    movieService.deleteMovie = jest.fn().mockResolvedValue(undefined);

    const res = await request(app).delete("/api/movies/movie123");

    expect(res.status).toBe(200);
    expect(movieService.deleteMovie).toHaveBeenCalledWith("movie123");
  });
});
