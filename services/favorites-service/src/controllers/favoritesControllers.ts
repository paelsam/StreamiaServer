/**
 * @file favoritesController.ts
 * @description Controller for managing user favorite movies.
 * Handles CRUD operations for user favorites with Cloudinary integration.
 * @author Streamia Team
 * @version 1.0.0
 * @created 2025-10-26
 * 
 * @module Controllers/Favorites
 */

import { Request, Response } from "express";
import Favorite from "../models/Favorites";
import Movie from "../../../movie-service/src/models/Movie";

/**
 * Get all favorites for the authenticated user with complete movie data
 * @async
 * @function getFavoritesByUser
 * @route GET /api/favorites
 * @access Private
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with user's favorites
 * @throws {Error} If database query fails
 */
export const getFavoritesByUser = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const favorites = await Favorite.find({ userId });

    const favoritesWithData = await Promise.all(
      favorites.map(async fav => {
        try {
          // Search in our Cloudinary database
          let movie = await Movie.findOne({ 
            $or: [
              { _id: fav.movieId },
              { cloudinaryPublicId: fav.movieId },
              { externalId: fav.movieId }
            ]
          });

          // If movie not found, return basic favorite data
          if (!movie) {
            return {
              movieId: fav.movieId,
              note: fav.note,
              title: fav.title || "Movie not available",
              poster: fav.poster || "",
              videoUrl: ""
            };
          }

          return {
            movieId: movie._id.toString(),
            note: fav.note,
            title: movie.title,
            poster: movie.coverImage,
            videoUrl: movie.videoUrl,
            // Additional Cloudinary data
            duration: movie.duration,
            hasAudio: movie.hasAudio,
            category: movie.category
          };
        } catch (err) {
          console.error(`❌ Error fetching movie ${fav.movieId}:`, err);
          // If fails, return basic DB data
          return {
            movieId: fav.movieId,
            note: fav.note,
            title: fav.title || "Error loading movie",
            poster: fav.poster || "",
            videoUrl: ""
          };
        }
      })
    );

    return res.json(favoritesWithData);
  } catch (error) {
    console.error("❌ Error fetching favorites:", error);
    return res.status(500).json({ message: "Error fetching favorites" });
  }
};

/**
 * Add a new movie to user's favorites
 * @async
 * @function addFavorite
 * @route POST /api/favorites
 * @access Private
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with created favorite
 * @throws {Error} If authentication fails or database operation fails
 */
export const addFavorite = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.userId;
    const { movieId, title, poster, note } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Validate required fields
    if (!movieId) {
      return res.status(400).json({ message: "Missing required field: movieId" });
    }

    // Get updated movie data from our database
    let movieTitle = title;
    let moviePoster = poster;

    if (!title || !poster) {
      const movie = await Movie.findOne({
        $or: [
          { _id: movieId },
          { cloudinaryPublicId: movieId },
          { externalId: movieId }
        ]
      });
      
      if (movie) {
        movieTitle = movie.title;
        moviePoster = movie.coverImage;
      }
    }

    // Prevent duplicate favorites
    const existing = await Favorite.findOne({ userId, movieId });
    if (existing) {
      return res.status(409).json({ message: "This movie is already in your favorites" });
    }

    // Create new favorite
    const newFavorite = new Favorite({
      userId,
      movieId,
      title: movieTitle || "Untitled movie",
      poster: moviePoster || "",
      note: note || ""
    });

    await newFavorite.save();
    return res.status(201).json(newFavorite);
  } catch (error) {
    console.error("❌ Error adding favorite:", error);
    return res.status(500).json({ message: "Failed to add movie to favorites, please try again later" });
  }
};

/**
 * Update a favorite's note for the authenticated user
 * @async
 * @function updateFavoriteNote
 * @route PUT /api/favorites/:id
 * @access Private
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with updated favorite
 * @throws {Error} If authentication fails or favorite not found
 */
export const updateFavoriteNote = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { note } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!id) {
      return res.status(400).json({ message: "Favorite ID is required" });
    }

    // Find favorite and verify ownership
    const favorite = await Favorite.findOne({ _id: id, userId });
    if (!favorite) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    // Update the note
    favorite.note = note || "";
    await favorite.save();

    return res.json({
      message: "Favorite updated successfully",
      favorite
    });
  } catch (error) {
    console.error("❌ Error updating favorite note:", error);
    return res.status(500).json({ message: "Failed to update favorite" });
  }
};

/**
 * Remove a movie from user's favorites
 * @async
 * @function removeFavorite
 * @route DELETE /api/favorites/:movieId
 * @access Private
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with success message
 * @throws {Error} If authentication fails or movie not found
 */
export const removeFavorite = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.userId;
    const { movieId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    if (!movieId) {
      return res.status(400).json({ message: "Movie ID is required" });
    }   

    const deleted = await Favorite.findOneAndDelete({ userId, movieId });

    if (!deleted) {
      return res.status(404).json({ message: "Movie not found or already removed" });
    }
    return res.json({ 
      message: "Movie removed from favorites successfully",
      removedMovie: {
        movieId: deleted.movieId,
        title: deleted.title
      }
    }); 
  } catch (error) {
    console.error("❌ Error removing favorite:", error);
    return res.status(500).json({ message: "Failed to remove favorite" });
  }
};