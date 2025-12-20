import { FavoritesService } from '../src/services/favoritesService';
import Favorite from '../src/models/Favorites';
import { EventBus } from '@streamia/shared';
import axios from 'axios';
import { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FavoritesService Tests', () => {
  let mongoServer: MongoMemoryServer;
  let eventBus: EventBus;
  let service: FavoritesService;
  let mockSubscribe: jest.Mock;
  let mockPublish: jest.Mock;

  beforeAll(async () => {
    // Silence console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockSubscribe = jest.fn();
    mockPublish = jest.fn().mockResolvedValue(undefined);
    
    eventBus = {
      subscribe: mockSubscribe,
      publish: mockPublish,
    } as any;

    service = new FavoritesService(eventBus);
  });

  afterEach(async () => {
    await Favorite.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Constructor and Event Setup', () => {
    it('should initialize service with eventBus', () => {
      const newService = new FavoritesService(eventBus);
      expect(newService).toBeInstanceOf(FavoritesService);
    });

    it('should subscribe to user.deleted event', () => {
      expect(mockSubscribe).toHaveBeenCalledWith('user.deleted', expect.any(Function));
    });

    it('should subscribe to movie.deleted event', () => {
      expect(mockSubscribe).toHaveBeenCalledWith('movie.deleted', expect.any(Function));
    });

    it('should handle user.deleted event correctly', async () => {
      const userId = new Types.ObjectId().toString();
      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(),
        note: 'test'
      });

      const userDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'user.deleted'
      )?.[1];

      await userDeletedHandler({ payload: { userId } });

      const remaining = await Favorite.findByUser(userId);
      expect(remaining.favorites).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Deleted 1 favorites for user ${userId}`));
    });

    it('should handle user.deleted event with invalid payload', async () => {
      const userDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'user.deleted'
      )?.[1];

      await userDeletedHandler({ payload: null });
      await userDeletedHandler({ payload: {} });
      await userDeletedHandler({});
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle movie.deleted event correctly', async () => {
      const movieId = new Types.ObjectId().toString();
      await Favorite.create({
        userId: new Types.ObjectId(),
        movieId: new Types.ObjectId(movieId),
        note: 'test'
      });

      const movieDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'movie.deleted'
      )?.[1];

      await movieDeletedHandler({ payload: { movieId } });

      const remaining = await Favorite.findByMovie(movieId);
      expect(remaining).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Deleted 1 favorites for movie ${movieId}`));
    });

    it('should handle movie.deleted event with invalid payload', async () => {
      const movieDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'movie.deleted'
      )?.[1];

      await movieDeletedHandler({ payload: null });
      await movieDeletedHandler({ payload: {} });
      await movieDeletedHandler({});
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle errors during user deletion gracefully', async () => {
      const userId = new Types.ObjectId().toString();
      
      // Mock deleteByUser to throw error
      jest.spyOn(Favorite, 'deleteByUser').mockRejectedValueOnce(new Error('DB Error'));

      const userDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'user.deleted'
      )?.[1];

      await userDeletedHandler({ payload: { userId } });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error deleting favorites for user ${userId}`),
        expect.any(Error)
      );
    });

    it('should handle errors during movie deletion gracefully', async () => {
      const movieId = new Types.ObjectId().toString();
      
      // Mock deleteByMovie to throw error
      jest.spyOn(Favorite, 'deleteByMovie').mockRejectedValueOnce(new Error('DB Error'));

      const movieDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'movie.deleted'
      )?.[1];

      await movieDeletedHandler({ payload: { movieId } });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error deleting favorites for movie ${movieId}`),
        expect.any(Error)
      );
    });
  });

  describe('validateMovie', () => {
    it('should pass validation when movie exists', async () => {
      const movieId = new Types.ObjectId().toString();
      mockedAxios.get.mockResolvedValueOnce({ data: { id: movieId, title: 'Test Movie' } });

      await expect(
        service.addFavorite(new Types.ObjectId().toString(), movieId)
      ).resolves.toBeDefined();
    });

    it('should throw NOT_FOUND error when movie does not exist (404)', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      await expect(
        service.addFavorite(userId, movieId)
      ).rejects.toMatchObject({
        message: 'Movie not found',
        code: 'NOT_FOUND'
      });
    });

    it('should throw NOT_FOUND error when movie response has no data', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      
      mockedAxios.get.mockResolvedValueOnce({ data: null });

      await expect(
        service.addFavorite(userId, movieId)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND'
      });
    });

    it('should throw NOT_FOUND error on network failure', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.addFavorite(userId, movieId)
      ).rejects.toMatchObject({
        message: 'Movie validation failed',
        code: 'NOT_FOUND'
      });
    });

    it('should call movie service with correct URL and timeout', async () => {
      const movieId = new Types.ObjectId().toString();
      mockedAxios.get.mockResolvedValueOnce({ data: { id: movieId } });

      await service.addFavorite(new Types.ObjectId().toString(), movieId);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/movies/${movieId}`),
        { timeout: 3000 }
      );
    });
  });

  describe('addFavorite', () => {
    it('should add a favorite successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      const note = 'Great movie!';

      mockedAxios.get.mockResolvedValueOnce({ data: { id: movieId } });

      const result = await service.addFavorite(userId, movieId, note);

      expect(result).toBeDefined();
      expect(result.userId.toString()).toBe(userId);
      expect(result.movieId.toString()).toBe(movieId);
      expect(result.note).toBe(note);
    });

    it('should add a favorite without note (empty string)', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      mockedAxios.get.mockResolvedValueOnce({ data: { id: movieId } });

      const result = await service.addFavorite(userId, movieId);

      expect(result.note).toBe('');
    });

    it('should throw DUPLICATE_FAVORITE error when favorite already exists', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      mockedAxios.get.mockResolvedValue({ data: { id: movieId } });

      await service.addFavorite(userId, movieId);

      await expect(
        service.addFavorite(userId, movieId)
      ).rejects.toMatchObject({
        message: 'This movie is already in your favorites',
        code: 'DUPLICATE_FAVORITE'
      });
    });

    it('should publish favorites.added event after adding', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      mockedAxios.get.mockResolvedValueOnce({ data: { id: movieId } });

      await service.addFavorite(userId, movieId);

      expect(mockPublish).toHaveBeenCalledWith('favorites.added', {
        userId,
        movieId,
        favoriteId: expect.any(String)
      });
    });

    it('should propagate validation errors', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      await expect(
        service.addFavorite(userId, movieId)
      ).rejects.toThrow();
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'test'
      });

      const result = await service.removeFavorite(userId, movieId);

      expect(result).toEqual({ success: true });
      expect(await Favorite.checkExists(userId, movieId)).toBe(false);
    });

    it('should throw FAVORITE_NOT_FOUND when favorite does not exist', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await expect(
        service.removeFavorite(userId, movieId)
      ).rejects.toThrow('FAVORITE_NOT_FOUND');
    });

    it('should publish favorites.removed event after removing', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'test'
      });

      await service.removeFavorite(userId, movieId);

      expect(mockPublish).toHaveBeenCalledWith('favorites.removed', {
        userId,
        movieId,
        favoriteId: expect.any(String)
      });
    });

    it('should propagate database errors', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      jest.spyOn(Favorite, 'findOneAndDelete').mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.removeFavorite(userId, movieId)
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getFavoritesByUser', () => {
    it('should return favorites for a user', async () => {
      const userId = new Types.ObjectId().toString();
      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(),
        note: 'test1'
      });
      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(),
        note: 'test2'
      });

      const result = await service.getFavoritesByUser(userId, {});

      expect(result.favorites).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should pass options to findByUser', async () => {
      const userId = new Types.ObjectId().toString();
      const options = { page: 1, limit: 10, sortOrder: 'asc' };

      jest.spyOn(Favorite, 'findByUser');

      await service.getFavoritesByUser(userId, options);

      expect(Favorite.findByUser).toHaveBeenCalledWith(userId, options);
    });

    it('should return empty array for user with no favorites', async () => {
      const userId = new Types.ObjectId().toString();

      const result = await service.getFavoritesByUser(userId, {});

      expect(result.favorites).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should propagate database errors', async () => {
      const userId = new Types.ObjectId().toString();

      jest.spyOn(Favorite, 'findByUser').mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.getFavoritesByUser(userId, {})
      ).rejects.toThrow('DB Error');
    });
  });

  describe('updateFavoriteNote', () => {
    it('should update favorite note successfully', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      const newNote = 'Updated note';

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'old note'
      });

      const result = await service.updateFavoriteNote(userId, movieId, newNote);

      expect(result).toBeDefined();
      expect(result.note).toBe(newNote);
    });

    it('should update note to empty string', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'old note'
      });

      const result = await service.updateFavoriteNote(userId, movieId, '');

      expect(result.note).toBe('');
    });

    it('should throw FAVORITE_NOT_FOUND when favorite does not exist', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await expect(
        service.updateFavoriteNote(userId, movieId, 'new note')
      ).rejects.toThrow('FAVORITE_NOT_FOUND');
    });

    it('should publish favorites.updated event after updating', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      const newNote = 'Updated note';

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'old note'
      });

      await service.updateFavoriteNote(userId, movieId, newNote);

      expect(mockPublish).toHaveBeenCalledWith('favorites.updated', {
        userId,
        movieId,
        favoriteId: expect.any(String),
        note: newNote
      });
    });

    it('should run validators on update', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();
      const longNote = 'a'.repeat(501); // Exceeds 500 character limit

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'old note'
      });

      await expect(
        service.updateFavoriteNote(userId, movieId, longNote)
      ).rejects.toThrow();
    });

    it('should handle document without toObject method', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'old note'
      });

      // Mock findOneAndUpdate to return plain object
      const plainObject = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'new note'
      };

      jest.spyOn(Favorite, 'findOneAndUpdate').mockResolvedValueOnce(plainObject as any);

      await service.updateFavoriteNote(userId, movieId, 'new note');

      expect(mockPublish).toHaveBeenCalledWith('favorites.updated', expect.objectContaining({
        favoriteId: plainObject._id.toString()
      }));
    });

    it('should propagate database errors', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      jest.spyOn(Favorite, 'findOneAndUpdate').mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.updateFavoriteNote(userId, movieId, 'new note')
      ).rejects.toThrow('DB Error');
    });
  });

  describe('checkFavorite', () => {
    it('should return true when favorite exists', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      await Favorite.create({
        userId: new Types.ObjectId(userId),
        movieId: new Types.ObjectId(movieId),
        note: 'test'
      });

      const result = await service.checkFavorite(userId, movieId);

      expect(result).toBe(true);
    });

    it('should return false when favorite does not exist', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      const result = await service.checkFavorite(userId, movieId);

      expect(result).toBe(false);
    });

    it('should propagate database errors', async () => {
      const userId = new Types.ObjectId().toString();
      const movieId = new Types.ObjectId().toString();

      jest.spyOn(Favorite, 'checkExists').mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.checkFavorite(userId, movieId)
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getFavoritesService (Singleton)', () => {
    it('should create a new instance if none exists', () => {
      // Reset module cache
      jest.resetModules();
      const module = require('../src/services/favoritesService');
      const instance = module.getFavoritesService(eventBus);

      expect(instance).toBeDefined();
      expect(typeof instance.addFavorite).toBe('function');
    });

    it('should return the same instance on subsequent calls', () => {
      jest.resetModules();
      const module = require('../src/services/favoritesService');
      const instance1 = module.getFavoritesService(eventBus);
      const instance2 = module.getFavoritesService();

      expect(instance1).toBe(instance2);
    });

    it('should throw error if eventBus is not provided on first call', () => {
      jest.resetModules();
      const module = require('../src/services/favoritesService');
      
      expect(() => {
        module.getFavoritesService();
      }).toThrow('EventBus is required to initialize FavoritesService');
    });

    it('should not require eventBus on subsequent calls', () => {
      jest.resetModules();
      const module = require('../src/services/favoritesService');
      module.getFavoritesService(eventBus);

      expect(() => {
        module.getFavoritesService();
      }).not.toThrow();
    });
  });
});
