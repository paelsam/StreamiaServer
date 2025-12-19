/**
 * @file Favorite.ts
 * @description Mongoose model for user favorite movies.
 * Each favorite stores the relationship between a user and a specific movie,
 * along with optional metadata such as title, poster, and personal notes.
 * @module Models/Favorite
 * @version 1.0.0
 * @created 2025-10-26
 */

import mongoose, { Document, Schema } from "mongoose";


/**
 * @interface IFavorite
 * @description Defines the structure of a favorite document in MongoDB.
 * @property {string} userId - The ID of the user who added the movie to favorites.
 * @property {string} movieId - The ID or public identifier of the movie (from database or Cloudinary).
 * @property {string} title - The movie title.
 * @property {string} poster - URL of the movie poster or cover image.
 * @property {string} [note] - Optional personal note or comment about the movie.
 */
export interface IFavorite extends Document {
  userId: string;
  movieId: string;
  title: string;
  poster: string;
  note?: string;
}

/**
 * @constant favoriteSchema
 * @description Schema definition for the Favorite model.
 * Includes timestamps for automatic `createdAt` and `updatedAt` tracking.
 */
const favoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: String, required: true },
    movieId: { type: String, required: true },
    title: { type: String, required: true },
    poster: { type: String, required: true },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

/**
 * @description Exports the Mongoose model for managing user favorites.
 * @exports Favorite
 */
export default mongoose.model<IFavorite>("Favorite", favoriteSchema);