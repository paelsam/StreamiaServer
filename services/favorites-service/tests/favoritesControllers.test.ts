import { Response } from 'express';
import { favoritesController } from '../src/controllers/favoritesControllers';
import { getFavoritesService } from '../src/services/favoritesService';
import { AuthRequest } from '../src/middlewares/authMiddleware';

// Mock de los servicios
jest.mock('../src/services/favoritesService');

describe('Favorites Controller Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockFavoritesService: any;

  // Silenciar console.error durante los tests
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset mocks antes de cada test
    jest.clearAllMocks();

    // Setup del mock del servicio
    mockFavoritesService = {
      getFavoritesByUser: jest.fn(),
      addFavorite: jest.fn(),
      updateFavoriteNote: jest.fn(),
      removeFavorite: jest.fn(),
      checkFavorite: jest.fn(),
    };

    (getFavoritesService as jest.Mock).mockReturnValue(mockFavoritesService);

    // Setup del request y response mock
    mockRequest = {
      userId: '507f1f77bcf86cd799439011',
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getFavoritesByUser', () => {
    it('should return favorites with default pagination', async () => {
      const mockFavorites = {
        favorites: [
          {
            _id: '507f1f77bcf86cd799439012',
            userId: '507f1f77bcf86cd799439011',
            movieId: '507f1f77bcf86cd799439013',
            note: 'Great movie',
            createdAt: new Date(),
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      };

      mockFavoritesService.getFavoritesByUser.mockResolvedValue(mockFavorites);

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockFavorites.favorites,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasMore: false,
          },
        })
      );
    });

    it('should return favorites with custom pagination parameters', async () => {
      mockRequest.query = {
        page: '2',
        limit: '10',
        sortBy: 'note',
        sortOrder: 'asc',
      };

      const mockFavorites = {
        favorites: [],
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasMore: false,
      };

      mockFavoritesService.getFavoritesByUser.mockResolvedValue(mockFavorites);

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockFavoritesService.getFavoritesByUser).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          page: 2,
          limit: 10,
          sortBy: 'note',
          sortOrder: 'asc',
        }
      );
    });

    it('should validate and sanitize page parameter (negative value)', async () => {
      mockRequest.query = { page: '-5' };

      const mockFavorites = {
        favorites: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };

      mockFavoritesService.getFavoritesByUser.mockResolvedValue(mockFavorites);

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockFavoritesService.getFavoritesByUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ page: 1 })
      );
    });

    it('should validate and sanitize limit parameter (exceeds max)', async () => {
      mockRequest.query = { limit: '200' };

      const mockFavorites = {
        favorites: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };

      mockFavoritesService.getFavoritesByUser.mockResolvedValue(mockFavorites);

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockFavoritesService.getFavoritesByUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should return 401 if userId is not present', async () => {
      mockRequest.userId = undefined;

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should handle service errors', async () => {
      mockFavoritesService.getFavoritesByUser.mockRejectedValue(
        new Error('Database error')
      );

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch favorites',
        },
      });
    });
  });

  describe('addFavorite', () => {
    beforeEach(() => {
      mockRequest.params = { movieId: '507f1f77bcf86cd799439013' };
      mockRequest.body = { note: 'Excellent movie!' };
    });

    it('should add a favorite successfully', async () => {
      const mockFavorite = {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        movieId: '507f1f77bcf86cd799439013',
        note: 'Excellent movie!',
        createdAt: new Date(),
      };

      mockFavoritesService.addFavorite.mockResolvedValue(mockFavorite);

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Movie added to favorites',
          data: mockFavorite,
        })
      );
    });

    it('should add favorite without note', async () => {
      mockRequest.body = {};
      const mockFavorite = {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        movieId: '507f1f77bcf86cd799439013',
        note: '',
      };

      mockFavoritesService.addFavorite.mockResolvedValue(mockFavorite);

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockFavoritesService.addFavorite).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439013',
        undefined
      );
    });

    it('should return 401 if userId is not present', async () => {
      mockRequest.userId = undefined;

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    });

    it('should return 400 if movieId is missing', async () => {
      mockRequest.params = { movieId: '' };

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Movie ID is required' },
      });
    });

    it('should return 400 if movieId has invalid format', async () => {
      mockRequest.params = { movieId: 'invalid-id' };

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_MOVIE_ID', message: 'Invalid movie ID format' },
      });
    });

    it('should return 400 if note is too long', async () => {
      mockRequest.body = { note: 'a'.repeat(501) };

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTE_TOO_LONG',
          message: 'Note must be less than 500 characters',
        },
      });
    });

    it('should return 409 if favorite already exists', async () => {
      const error: any = new Error('This movie is already in your favorites');
      error.code = 'DUPLICATE_FAVORITE';
      mockFavoritesService.addFavorite.mockRejectedValue(error);

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DUPLICATE_FAVORITE',
          message: 'This movie is already in your favorites',
        },
      });
    });

    it('should return 404 if movie is not found', async () => {
      const error: any = new Error('Movie not found');
      error.code = 'NOT_FOUND';
      mockFavoritesService.addFavorite.mockRejectedValue(error);

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Movie not found',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockFavoritesService.addFavorite.mockRejectedValue(
        new Error('Unexpected error')
      );

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add favorite',
        },
      });
    });
  });

  describe('updateFavoriteNote', () => {
    beforeEach(() => {
      mockRequest.params = { movieId: '507f1f77bcf86cd799439013' };
      mockRequest.body = { note: 'Updated note' };
    });

    it('should update favorite note successfully', async () => {
      const mockUpdated = {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        movieId: '507f1f77bcf86cd799439013',
        note: 'Updated note',
      };

      mockFavoritesService.updateFavoriteNote.mockResolvedValue(mockUpdated);

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Favorite updated successfully',
        data: mockUpdated,
      });
    });

    it('should update with empty note', async () => {
      mockRequest.body = { note: '' };
      const mockUpdated = {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        movieId: '507f1f77bcf86cd799439013',
        note: '',
      };

      mockFavoritesService.updateFavoriteNote.mockResolvedValue(mockUpdated);

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if userId is not present', async () => {
      mockRequest.userId = undefined;

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    });

    it('should return 400 if movieId has invalid format', async () => {
      mockRequest.params = { movieId: 'invalid-id' };

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_MOVIE_ID', message: 'Invalid movie ID format' },
      });
    });

    it('should return 400 if note is too long', async () => {
      mockRequest.body = { note: 'a'.repeat(501) };

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOTE_TOO_LONG',
          message: 'Note must be less than 500 characters',
        },
      });
    });

    it('should return 404 if favorite is not found', async () => {
      const error: any = new Error('FAVORITE_NOT_FOUND');
      error.code = 'FAVORITE_NOT_FOUND';
      mockFavoritesService.updateFavoriteNote.mockRejectedValue(error);

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FAVORITE_NOT_FOUND',
          message: 'Favorite not found',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockFavoritesService.updateFavoriteNote.mockRejectedValue(
        new Error('Unexpected error')
      );

      await favoritesController.updateFavoriteNote(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update favorite',
        },
      });
    });
  });

  describe('removeFavorite', () => {
    beforeEach(() => {
      mockRequest.params = { movieId: '507f1f77bcf86cd799439013' };
    });

    it('should remove favorite successfully', async () => {
      mockFavoritesService.removeFavorite.mockResolvedValue({ success: true });

      await favoritesController.removeFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Movie removed from favorites',
        })
      );
    });

    it('should return 401 if userId is not present', async () => {
      mockRequest.userId = undefined;

      await favoritesController.removeFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    });

    it('should return 400 if movieId has invalid format', async () => {
      mockRequest.params = { movieId: 'invalid-id' };

      await favoritesController.removeFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_MOVIE_ID', message: 'Invalid movie ID format' },
      });
    });

    it('should return 404 if favorite is not found', async () => {
      const error: any = new Error('FAVORITE_NOT_FOUND');
      error.code = 'FAVORITE_NOT_FOUND';
      mockFavoritesService.removeFavorite.mockRejectedValue(error);

      await favoritesController.removeFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FAVORITE_NOT_FOUND',
          message: 'Favorite not found',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockFavoritesService.removeFavorite.mockRejectedValue(
        new Error('Unexpected error')
      );

      await favoritesController.removeFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove favorite',
        },
      });
    });
  });

  describe('checkFavorite', () => {
    beforeEach(() => {
      mockRequest.params = { movieId: '507f1f77bcf86cd799439013' };
    });

    it('should return true if movie is in favorites', async () => {
      mockFavoritesService.checkFavorite.mockResolvedValue(true);

      await favoritesController.checkFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isFavorite: true,
          movieId: '507f1f77bcf86cd799439013',
          userId: '507f1f77bcf86cd799439011',
        },
      });
    });

    it('should return false if movie is not in favorites', async () => {
      mockFavoritesService.checkFavorite.mockResolvedValue(false);

      await favoritesController.checkFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isFavorite: false,
          movieId: '507f1f77bcf86cd799439013',
          userId: '507f1f77bcf86cd799439011',
        },
      });
    });

    it('should return 401 if userId is not present', async () => {
      mockRequest.userId = undefined;

      await favoritesController.checkFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    });

    it('should return 400 if movieId has invalid format', async () => {
      mockRequest.params = { movieId: 'invalid-id' };

      await favoritesController.checkFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_MOVIE_ID', message: 'Invalid movie ID format' },
      });
    });

    it('should handle service errors', async () => {
      mockFavoritesService.checkFavorite.mockRejectedValue(
        new Error('Database error')
      );

      await favoritesController.checkFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check favorite status',
        },
      });
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle movieId with only spaces in addFavorite', async () => {
      mockRequest.params = { movieId: '   ' };

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Movie ID is required' },
      });
    });

    it('should handle note with exactly 500 characters', async () => {
      mockRequest.params = { movieId: '507f1f77bcf86cd799439013' };
      mockRequest.body = { note: 'a'.repeat(500) };

      const mockFavorite = {
        _id: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        movieId: '507f1f77bcf86cd799439013',
        note: 'a'.repeat(500),
      };

      mockFavoritesService.addFavorite.mockResolvedValue(mockFavorite);

      await favoritesController.addFavorite(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle invalid query parameters in getFavoritesByUser', async () => {
      mockRequest.query = {
        page: 'invalid',
        limit: 'invalid',
      };

      const mockFavorites = {
        favorites: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };

      mockFavoritesService.getFavoritesByUser.mockResolvedValue(mockFavorites);

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockFavoritesService.getFavoritesByUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });

    it('should handle zero limit in pagination', async () => {
      mockRequest.query = { limit: '0' };

      const mockFavorites = {
        favorites: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };

      mockFavoritesService.getFavoritesByUser.mockResolvedValue(mockFavorites);

      await favoritesController.getFavoritesByUser(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Limit is validated to be at least 1, so 0 becomes 1, then defaults to 20
      expect(mockFavoritesService.getFavoritesByUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ 
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
      );
    });
  });
});
