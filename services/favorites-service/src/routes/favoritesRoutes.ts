import { Router } from "express";
import { favoritesController } from "../controllers/favoritesControllers";
import { authenticate } from "../middlewares/authMiddleware";
import { 
  validateBody,
  validateQuery,
  validateParams 
} from "../middlewares/validation";
import { 
  favoritesQuerySchema,
  movieIdSchema,
  addFavoriteBodySchema,
  updateFavoriteBodySchema
} from "../validators/favoriteValidators";

const router = Router();

/**
 * @module routes/favorites
 * @description Favorites management routes
 * Base path: /api/favorites
 * 
 * All routes require authentication (except health check)
 */

// ========== HEALTH CHECK (sin autenticación) ==========

/**
 * @route GET /api/favorites/health
 * @summary Health check for favorites service
 * @returns {200} {status: 'ok', service: 'favorites'}
 */
router.get(
  "/health",
  (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'favorites' });
  }
);

// ========== MIDDLEWARE GLOBAL ==========
// Todas las rutas siguientes requieren autenticación
router.use(authenticate);

// ========== GET ROUTES ==========

/**
 * @route GET /api/favorites
 * @summary Get user's favorites with pagination and sorting
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {string} sortBy - Sort field (default: 'createdAt')
 * @query {string} sortOrder - Sort order: 'asc' | 'desc' (default: 'desc')
 * @returns {200} List of favorites with pagination
 */
router.get(
  "/", 
  validateQuery(favoritesQuerySchema),
  favoritesController.getFavoritesByUser
);

/**
 * @route GET /api/favorites/:movieId/check
 * @summary Check if a specific movie is in user's favorites
 * @param {string} movieId - Movie ID (MongoDB ObjectId)
 * @returns {200} {isFavorite: boolean, movieId: string, userId: string}
 */
router.get(
  "/:movieId/check", 
  validateParams(movieIdSchema),
  favoritesController.checkFavorite
);

// ========== POST ROUTES ==========

/**
 * @route POST /api/favorites/:movieId
 * @summary Add a movie to user's favorites
 * @param {string} movieId - Movie ID (MongoDB ObjectId)
 * @body {string} [note] - Optional note about the favorite (max 500 chars)
 * @returns {201} Created favorite
 * @error {409} Movie already in favorites
 * @error {404} Movie not found
 */
router.post(
  "/:movieId",
  validateParams(movieIdSchema),
  validateBody(addFavoriteBodySchema),
  favoritesController.addFavorite
);

// ========== PUT ROUTES ==========

/**
 * @route PUT /api/favorites/:movieId
 * @summary Update the note of an existing favorite
 * @param {string} movieId - Movie ID (MongoDB ObjectId)
 * @body {string} note - Updated note (max 500 chars)
 * @returns {200} Updated favorite
 * @error {404} Favorite not found
 */
router.put(
  "/:movieId",
  validateParams(movieIdSchema),
  validateBody(updateFavoriteBodySchema),
  favoritesController.updateFavoriteNote
);

// ========== PATCH ROUTES ==========

/**
 * @route PATCH /api/favorites/:movieId
 * @summary Partially update a favorite (note)
 * @param {string} movieId - Movie ID
 * @body {string} [note] - Optional updated note
 * @returns {200} Updated favorite
 */
router.patch(
  "/:movieId",
  validateParams(movieIdSchema),
  validateBody(updateFavoriteBodySchema),
  favoritesController.updateFavoriteNote
);

// ========== DELETE ROUTES ==========

/**
 * @route DELETE /api/favorites/:movieId
 * @summary Remove a movie from user's favorites
 * @param {string} movieId - Movie ID (MongoDB ObjectId)
 * @returns {200} Success message
 * @error {404} Favorite not found
 */
router.delete(
  "/:movieId",
  validateParams(movieIdSchema),
  favoritesController.removeFavorite
);

export default router;