import { MovieService } from "../src/services/movieService";
import { Movie } from "../src/models/Movie";
import { uploadToCloudinary, uploadSubtitle } from "../src/config/cloudinary";
import fs from "fs";

jest.mock("../src/models/Movie");
jest.mock("../src/config/cloudinary");
jest.mock("fs");

describe("MovieService", () => {
  let movieService: MovieService;
  let mockEventBus: any;

  beforeEach(() => {
    mockEventBus = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined)
    };

    movieService = new MovieService(mockEventBus);
    jest.clearAllMocks();
  });

  describe("getMovies", () => {
    it("should return all movies", async () => {
      const mockMovies = [
        { _id: "1", title: "Movie 1", category: "Action" },
        { _id: "2", title: "Movie 2", category: "Drama" }
      ];

      (Movie.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMovies)
      });

      const result = await movieService.getMovies({});

      expect(Movie.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockMovies);
    });

    it("should filter movies by category", async () => {
      const mockMovies = [{ _id: "1", title: "Action Movie", category: "Action" }];

      (Movie.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMovies)
      });

      await movieService.getMovies({ category: "Action" });

      expect(Movie.find).toHaveBeenCalledWith({
        category: { $regex: "Action", $options: "i" }
      });
    });

    it("should search movies by title", async () => {
      const mockMovies = [{ _id: "1", title: "Matrix", category: "Sci-Fi" }];

      (Movie.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMovies)
      });

      await movieService.getMovies({ search: "Matrix" });

      expect(Movie.find).toHaveBeenCalledWith({
        title: { $regex: "Matrix", $options: "i" }
      });
    });
  });

  describe("getMovieById", () => {
    it("should return movie by MongoDB ID", async () => {
      const mockMovie = { _id: "507f1f77bcf86cd799439011", title: "Test Movie" };

      (Movie.findById as jest.Mock).mockResolvedValue(mockMovie);

      const result = await movieService.getMovieById("507f1f77bcf86cd799439011");

      expect(Movie.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(result).toEqual(mockMovie);
    });

    it("should throw error if movie not found", async () => {
      (Movie.findById as jest.Mock).mockResolvedValue(null);
      (Movie.findOne as jest.Mock).mockResolvedValue(null);

      await expect(movieService.getMovieById("nonexistent")).rejects.toThrow("Movie not found");
    });
  });

  describe("updateMovie", () => {
    it("should update movie successfully", async () => {
      const updatedMovie = { _id: "123", title: "Updated Title" };

      (Movie.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedMovie);

      const result = await movieService.updateMovie("123", { title: "Updated Title" });

      expect(Movie.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { title: "Updated Title" },
        { new: true }
      );
      expect(result).toEqual(updatedMovie);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it("should throw error if movie not found", async () => {
      (Movie.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(movieService.updateMovie("123", { title: "Updated" })).rejects.toThrow(
        "Movie not found"
      );
    });
  });

  describe("deleteMovie", () => {
    it("should delete movie successfully", async () => {
      const mockMovie = { _id: "123", cloudinaryPublicId: "public_id" };

      (Movie.findByIdAndDelete as jest.Mock).mockResolvedValue(mockMovie);

      await movieService.deleteMovie("123");

      expect(Movie.findByIdAndDelete).toHaveBeenCalledWith("123");
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it("should throw error if movie not found", async () => {
      (Movie.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(movieService.deleteMovie("123")).rejects.toThrow("Movie not found");
    });
  });

  describe("getSubtitles", () => {
    it("should return subtitles for a movie", async () => {
      const mockMovie = {
        _id: "123",
        title: "Test Movie",
        subtitles: [
          { language: "en", label: "English", url: "https://example.com/en.vtt" }
        ]
      };

      (Movie.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockMovie)
      });

      const result = await movieService.getSubtitles("123");

      expect(result).toEqual({
        movie: "Test Movie",
        subtitles: mockMovie.subtitles
      });
    });

    it("should throw error if movie not found", async () => {
      (Movie.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(movieService.getSubtitles("123")).rejects.toThrow("Movie not found");
    });
  });

  describe("createMovie", () => {
    it("should create movie successfully", async () => {
      const mockUploadResult = {
        public_id: "test_id",
        secure_url: "https://cloudinary.com/video.mp4",
        thumbnail_url: "https://cloudinary.com/thumb.jpg",
        format: "mp4",
        duration: 120
      };

      const mockMovie = {
        _id: "123",
        title: "Test Movie",
        videoUrl: mockUploadResult.secure_url
      };

      (uploadToCloudinary as jest.Mock).mockResolvedValue(mockUploadResult);
      (Movie.create as jest.Mock).mockResolvedValue(mockMovie);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await movieService.createMovie("/path/to/video.mp4", {
        title: "Test Movie"
      });

      expect(uploadToCloudinary).toHaveBeenCalled();
      expect(Movie.create).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith("/path/to/video.mp4");
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(result).toEqual(mockMovie);
    });
  });

  describe("addSubtitle", () => {
    it("should add subtitle successfully", async () => {
      const mockMovie = {
        _id: "123",
        cloudinaryPublicId: "movie_id",
        subtitles: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockSubtitleResult = {
        secure_url: "https://cloudinary.com/subtitle.vtt"
      };

      (Movie.findById as jest.Mock).mockResolvedValue(mockMovie);
      (uploadSubtitle as jest.Mock).mockResolvedValue(mockSubtitleResult);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await movieService.addSubtitle("123", "/path/to/subtitle.vtt", {
        language: "en",
        label: "English"
      });

      expect(Movie.findById).toHaveBeenCalledWith("123");
      expect(uploadSubtitle).toHaveBeenCalled();
      expect(mockMovie.save).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith("/path/to/subtitle.vtt");
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it("should throw error if movie not found", async () => {
      (Movie.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        movieService.addSubtitle("123", "/path/to/subtitle.vtt", {
          language: "en",
          label: "English"
        })
      ).rejects.toThrow("Movie not found");
    });
  });
});
