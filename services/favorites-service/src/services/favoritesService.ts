import Favorite from "../models/Favorites";
import { EventBus } from '@streamia/shared';
import { Types } from "mongoose";
import axios from "axios";
import { config } from "../config";

export class FavoritesService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Suscribirse a eventos del sistema usando any para evitar problemas de tipos
    this.eventBus.subscribe('user.deleted' as any, async (event: any) => {
      if (event.payload && event.payload.userId) {
        await this.handleUserDeleted(event.payload.userId);
      }
    });

    this.eventBus.subscribe('movie.deleted' as any, async (event: any) => {
      if (event.payload && event.payload.movieId) {
        await this.handleMovieDeleted(event.payload.movieId);
      }
    });
  }

  private async handleUserDeleted(userId: string) {
    try {
      const count = await Favorite.deleteByUser(userId);
      console.log(`🗑️ Deleted ${count} favorites for user ${userId}`);
    } catch (error) {
      console.error(`Error deleting favorites for user ${userId}:`, error);
    }
  }

  private async handleMovieDeleted(movieId: string) {
    try {
      const count = await Favorite.deleteByMovie(movieId);
      console.log(`🗑️ Deleted ${count} favorites for movie ${movieId}`);
    } catch (error) {
      console.error(`Error deleting favorites for movie ${movieId}:`, error);
    }
  }

  private async validateMovie(movieId: string): Promise<void> {
    try {
      const response = await axios.get(`${config.movieServiceUrl}/api/v1/movies/${movieId}`, { timeout: 3000 });
      if (!response.data) {
        const err: any = new Error('Movie not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
    } catch (error: any) {
      if (error && error.response && error.response.status === 404) {
        const err: any = new Error('Movie not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      const err: any = new Error('Movie validation failed');
      err.code = 'NOT_FOUND';
      throw err;
    }
  }

  async addFavorite(userId: string, movieId: string, note?: string) {
    try {
      await this.validateMovie(movieId);

      const exists = await Favorite.checkExists(userId, movieId);
      if (exists) {
        const err: any = new Error('This movie is already in your favorites');
        err.code = 'DUPLICATE_FAVORITE';
        throw err;
      }

      const favorite = await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: note || ""
      });

      await this.eventBus.publish('favorites.added' as any, {
        userId,
        movieId,
        favoriteId: favorite._id.toString()
      });

      return favorite;
    } catch (error) {
      throw error;
    }
  }

    async removeFavorite(userId: string, movieId: string) {
        try {
        const favorite = await Favorite.findOneAndDelete({
            userId: new Types.ObjectId(userId),
            movieId: new Types.ObjectId(movieId)
        });

        if (!favorite) {
            throw new Error('FAVORITE_NOT_FOUND');
        }

        await this.eventBus.publish('favorites.removed' as any, {
            userId,
            movieId,
            favoriteId: (favorite as any)._id.toString()
        });

        return { success: true };
        } catch (error) {
        throw error;
    }
  }

  async getFavoritesByUser(userId: string, options: any) {
    try {
      return await Favorite.findByUser(userId, options);
    } catch (error) {
      throw error;
    }
  }

  async updateFavoriteNote(userId: string, movieId: string, note: string) {
    try {
      const result = await Favorite.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          movieId: new Types.ObjectId(movieId)
        },
        { note },
        { new: true, runValidators: true }
      );

      if (!result) {
        throw new Error('FAVORITE_NOT_FOUND');
      }

      // Asegurar que el resultado tiene la propiedad _id
      const favorite = result.toObject ? result.toObject() : result;

      await this.eventBus.publish('favorites.updated' as any, {
        userId,
        movieId,
        favoriteId: favorite._id.toString(),
        note
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async checkFavorite(userId: string, movieId: string): Promise<boolean> {
    try {
      return await Favorite.checkExists(userId, movieId);
    } catch (error) {
      throw error;
    }
  }
}

let favoritesServiceInstance: FavoritesService | null = null;

export const getFavoritesService = (eventBus?: EventBus): FavoritesService => {
  if (!favoritesServiceInstance) {
    if (!eventBus) {
      throw new Error('EventBus is required to initialize FavoritesService');
    }
    favoritesServiceInstance = new FavoritesService(eventBus);
  }
  return favoritesServiceInstance;
};

export default FavoritesService;