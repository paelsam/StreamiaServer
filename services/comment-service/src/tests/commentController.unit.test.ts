import { Response } from 'express';
import { CommentController } from '../controllers/commentController';
import { Comment } from '../models/Comment';
import { AuthRequest } from '../middlewares';

// Mock del modelo Comment
jest.mock('../models/Comment');

describe('CommentController - Unit Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks antes de cada test
    jest.clearAllMocks();

    // Mock de response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Mock de request
    mockRequest = {
      params: {},
      query: {},
      body: {},
      userId: 'test-user-id',
    };
  });

  describe('getCommentsByMovie', () => {
    it('should return comments for a movie with pagination', async () => {
      const mockComments = [
        { _id: '1', movieId: 'movie123', userId: 'user1', text: 'Great movie!' },
        { _id: '2', movieId: 'movie123', userId: 'user2', text: 'Awesome!' },
      ];

      mockRequest.params = { movieId: 'movie123' };
      mockRequest.query = { page: '1', limit: '10' };

      (Comment.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockComments),
          }),
        }),
      });

      (Comment.countDocuments as jest.Mock).mockResolvedValue(2);

      await CommentController.getCommentsByMovie(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockComments,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should return empty array when no comments exist', async () => {
      mockRequest.params = { movieId: 'movie123' };

      (Comment.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      (Comment.countDocuments as jest.Mock).mockResolvedValue(0);

      await CommentController.getCommentsByMovie(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { movieId: 'movie123' };

      (Comment.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      await CommentController.getCommentsByMovie(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch comments',
      });
    });
  });

  describe('getCommentById', () => {
    it('should return a comment by ID', async () => {
      const mockComment = {
        _id: 'comment123',
        movieId: 'movie123',
        userId: 'user1',
        text: 'Great movie!',
      };

      mockRequest.params = { commentId: 'comment123' };

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

      await CommentController.getCommentById(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
      });
    });

    it('should return 404 when comment not found', async () => {
      mockRequest.params = { commentId: 'nonexistent' };

      (Comment.findById as jest.Mock).mockResolvedValue(null);

      await CommentController.getCommentById(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Comment not found',
      });
    });

    it('should handle errors', async () => {
      mockRequest.params = { commentId: 'comment123' };

      (Comment.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await CommentController.getCommentById(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch comment',
      });
    });
  });

  describe('createComment', () => {
    it('should create a new comment successfully', async () => {
      const mockComment = {
        _id: 'new-comment-id',
        movieId: 'movie123',
        userId: 'test-user-id',
        text: 'Amazing movie!',
        save: jest.fn().mockResolvedValue(true),
      };

      mockRequest.body = {
        movieId: 'movie123',
        text: 'Amazing movie!',
      };
      mockRequest.userId = 'test-user-id';

      (Comment as any).mockImplementation(() => mockComment);

      await CommentController.createComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
      });
      expect(mockComment.save).toHaveBeenCalled();
    });

    it('should return 400 when movieId is missing', async () => {
      mockRequest.body = { text: 'Great movie!' };

      await CommentController.createComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'movieId and text are required',
      });
    });

    it('should return 400 when text is missing', async () => {
      mockRequest.body = { movieId: 'movie123' };

      await CommentController.createComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'movieId and text are required',
      });
    });

    it('should handle save errors', async () => {
      const mockComment = {
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      mockRequest.body = {
        movieId: 'movie123',
        text: 'Great movie!',
      };

      (Comment as any).mockImplementation(() => mockComment);

      await CommentController.createComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create comment',
      });
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const mockComment = {
        _id: 'comment123',
        movieId: 'movie123',
        userId: 'test-user-id',
        text: 'Old text',
        save: jest.fn().mockResolvedValue(true),
      };

      mockRequest.params = { commentId: 'comment123' };
      mockRequest.body = { text: 'Updated text' };
      mockRequest.userId = 'test-user-id';

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

      await CommentController.updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockComment.text).toBe('Updated text');
      expect(mockComment.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
      });
    });

    it('should return 404 when comment not found', async () => {
      mockRequest.params = { commentId: 'nonexistent' };
      mockRequest.body = { text: 'Updated text' };

      (Comment.findById as jest.Mock).mockResolvedValue(null);

      await CommentController.updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Comment not found',
      });
    });

    it('should return 403 when user is not the owner', async () => {
      const mockComment = {
        _id: 'comment123',
        userId: 'different-user-id',
        text: 'Old text',
      };

      mockRequest.params = { commentId: 'comment123' };
      mockRequest.body = { text: 'Updated text' };
      mockRequest.userId = 'test-user-id';

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

      await CommentController.updateComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized to update this comment',
      });
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      const mockComment = {
        _id: 'comment123',
        userId: 'test-user-id',
        movieId: 'movie123',
        text: 'Test comment',
      };

      mockRequest.params = { commentId: 'comment123' };
      mockRequest.userId = 'test-user-id';

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);
      (Comment.findByIdAndDelete as jest.Mock).mockResolvedValue(mockComment);

      await CommentController.deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith('comment123');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Comment deleted successfully',
      });
    });

    it('should return 404 when comment not found', async () => {
      mockRequest.params = { commentId: 'nonexistent' };

      (Comment.findById as jest.Mock).mockResolvedValue(null);

      await CommentController.deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Comment not found',
      });
    });

    it('should return 403 when user is not the owner', async () => {
      const mockComment = {
        _id: 'comment123',
        userId: 'different-user-id',
        text: 'Test comment',
      };

      mockRequest.params = { commentId: 'comment123' };
      mockRequest.userId = 'test-user-id';

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

      await CommentController.deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized to delete this comment',
      });
    });

    it('should handle deletion errors', async () => {
      const mockComment = {
        _id: 'comment123',
        userId: 'test-user-id',
      };

      mockRequest.params = { commentId: 'comment123' };
      mockRequest.userId = 'test-user-id';

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);
      (Comment.findByIdAndDelete as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      await CommentController.deleteComment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to delete comment',
      });
    });
  });
});
