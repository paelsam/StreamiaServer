import { Router } from "express";
import {
    addFavorite,
    getFavoritesByUser,
    removeFavorite,
    updateFavoriteNote
} from "../controllers/favoritesControllers";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @module routes/favorites
 * @description
 * Defines all routes related to user favorites management.
 * All routes are protected by the authentication middleware.
 *
 * **Base path:** `/api/favorites`
 *
 * ### Example Endpoints:
 * - `GET    /api/favorites`             → Get all favorites of the authenticated user
 * - `POST   /api/favorites`             → Add a new favorite
 * - `PUT    /api/favorites/:id`         → Update a favorite’s note
 * - `DELETE /api/favorites/:movieId`    → Remove a favorite by movie ID
 *
 * @requires express.Router
 * @requires controllers/favoritesController
 * @requires middlewares/authMiddleware
 */


/**
 * Applies authentication middleware to all favorites routes.
 * @middleware
 */
router.use(authenticate);

/**
 * GET /api/favorites
 * @summary Get all favorites of the authenticated user.
 * @description
 * Returns the complete list of movies marked as favorites by the logged-in user.
 *
 * @function
 * @name GET/api/favorites
 * @memberof module:routes/favorites
 * @returns {Promise<Object[]>} Array of favorite movie objects.
 * @example
 * // Example response:
 * [
 *   { movieId: "123", title: "Inception", note: "Excellent plot" },
 *   { movieId: "456", title: "The Matrix", note: "A sci-fi classic" }
 * ]
 */
router.get("/", getFavoritesByUser);

/**
 * POST /api/favorites
 * @summary Add a new favorite movie.
 * @description
 * Creates a new favorite record for the authenticated user.
 *
 * @function
 * @name POST/api/favorites
 * @memberof module:routes/favorites
 * @param {Object} req.body - Favorite data.
 * @param {string} req.body.movieId - The ID of the movie to be added.
 * @param {string} [req.body.note] - Optional note or comment about the movie.
 * @returns {Promise<Object>} The newly created favorite object.
 * @example
 * // Example request body:
 * {
 *   "movieId": "789",
 *   "note": "To watch later"
 * }
 */
router.post("/", addFavorite);


/**
 * PUT /api/favorites/:id
 * @summary Update a favorite's note.
 * @description
 * Allows the user to edit the note or comment associated with a favorite movie.
 *
 * @function
 * @name PUT/api/favorites/:id
 * @memberof module:routes/favorites
 * @param {string} req.params.id - The favorite record ID to update.
 * @param {Object} req.body - The updated data.
 * @param {string} req.body.note - The new note text.
 * @returns {Promise<Object>} The updated favorite object.
 * @example
 * // Example request body:
 * {
 *   "note": "Rewatched it, still great!"
 * }
 */
router.put("/:id", updateFavoriteNote);

/**
 * DELETE /api/favorites/:movieId
 * @summary Remove a favorite movie.
 * @description
 * Deletes a favorite entry based on the given `movieId`.
 *
 * @function
 * @name DELETE/api/favorites/:movieId
 * @memberof module:routes/favorites
 * @param {string} req.params.movieId - The ID of the movie to remove from favorites.
 * @returns {Promise<Object>} Confirmation message or status.
 * @example
 * // Example endpoint:
 * DELETE /api/favorites/789
 */
router.delete("/:movieId", removeFavorite);

export default router;