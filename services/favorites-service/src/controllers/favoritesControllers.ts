import { Response } from "express";
import { isValidObjectId } from 'mongoose';
import { getFavoritesService } from "../services/favoritesService";
import { AuthRequest } from "../middlewares/authMiddleware";

export const favoritesController = {
  /**
   * Get all favorites for authenticated user
   */
  async getFavoritesByUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required"
          }
        });
      }

      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as any;
      
      // Validar y sanitizar parámetros de paginación
      const validatedPage = Math.max(1, parseInt(page, 10) || 1);
      const validatedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      
      const favoritesService = getFavoritesService();
      const result = await favoritesService.getFavoritesByUser(userId, {
        page: validatedPage,
        limit: validatedLimit,
        sortBy,
        sortOrder
      });
      
      return res.status(200).json({
        success: true,
        data: result.favorites,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore
        },
        meta: {
          userId,
          fetchedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error("❌ Controller Error - getFavoritesByUser:", error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch favorites"
        }
      });
    }
  },

  /**
   * Add movie to favorites
   */
  async addFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { movieId } = req.params;
      const { note } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" }
        });
      }

      if (!movieId || movieId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Movie ID is required" }
        });
      }

      // Validar formato de ObjectId
      if (!isValidObjectId(movieId)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_MOVIE_ID", message: "Invalid movie ID format" }
        });
      }

      // Validar longitud de nota (opcional)
      if (note && note.length > 500) {
        return res.status(400).json({
          success: false,
          error: { code: "NOTE_TOO_LONG", message: "Note must be less than 500 characters" }
        });
      }

      const favoritesService = getFavoritesService();
      const favorite = await favoritesService.addFavorite(userId, movieId, note);

      return res.status(201).json({
        success: true,
        message: "Movie added to favorites",
        data: favorite,
        meta: {
          userId,
          movieId,
          addedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error("❌ Controller Error - addFavorite:", error);

      if (error.code === "DUPLICATE_FAVORITE") {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_FAVORITE",
            message: "This movie is already in your favorites"
          }
        });
      }

      if (error.code === "NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND", 
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to add favorite"
        }
      });
    }
  },

  /**
   * Update favorite note
   */
  async updateFavoriteNote(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { movieId } = req.params;
      const { note } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" }
        });
      }

      // Validar formato de ObjectId
      if (!isValidObjectId(movieId)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_MOVIE_ID", message: "Invalid movie ID format" }
        });
      }

      // Validar longitud de nota
      if (note && note.length > 500) {
        return res.status(400).json({
          success: false,
          error: { code: "NOTE_TOO_LONG", message: "Note must be less than 500 characters" }
        });
      }

      const favoritesService = getFavoritesService();
      const updated = await favoritesService.updateFavoriteNote(userId, movieId, note);

      return res.status(200).json({
        success: true,
        message: "Favorite updated successfully",
        data: updated
      });

    } catch (error: any) {
      console.error("❌ Controller Error - updateFavoriteNote:", error);

      if (error.code === "FAVORITE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "FAVORITE_NOT_FOUND",
            message: "Favorite not found"
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update favorite"
        }
      });
    }
  },

  /**
   * Remove movie from favorites
   */
  async removeFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { movieId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" }
        });
      }

      // Validar formato de ObjectId
      if (!isValidObjectId(movieId)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_MOVIE_ID", message: "Invalid movie ID format" }
        });
      }

      const favoritesService = getFavoritesService();
      await favoritesService.removeFavorite(userId, movieId);

      return res.status(200).json({
        success: true,
        message: "Movie removed from favorites",
        meta: {
          userId,
          movieId,
          removedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error("❌ Controller Error - removeFavorite:", error);

      if (error.code === "FAVORITE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: {
            code: "FAVORITE_NOT_FOUND",
            message: "Favorite not found"
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to remove favorite"
        }
      });
    }
  },

  /**
   * Check if movie is in favorites
   */
  async checkFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { movieId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" }
        });
      }

      // Validar formato de ObjectId
      if (!isValidObjectId(movieId)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_MOVIE_ID", message: "Invalid movie ID format" }
        });
      }

      const favoritesService = getFavoritesService();
      const isFavorite = await favoritesService.checkFavorite(userId, movieId);

      return res.status(200).json({
        success: true,
        data: { 
          isFavorite,
          movieId,
          userId 
        }
      });

    } catch (error: any) {
      console.error("❌ Controller Error - checkFavorite:", error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check favorite status"
        }
      });
    }
  }
};

// Exportar funciones individuales (compatibilidad)
export const getFavorites = favoritesController.getFavoritesByUser;
export const addFavorite = favoritesController.addFavorite;
export const updateFavoriteNote = favoritesController.updateFavoriteNote;
export const removeFavorite = favoritesController.removeFavorite;
export const checkFavorite = favoritesController.checkFavorite;