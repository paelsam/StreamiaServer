import { Router } from 'express';
import { authMiddleware } from '../middlewares';
import { CommentController } from '../controllers/commentController';

const router = Router();

// Public routes
router.get('/movie/:movieId', CommentController.getCommentsByMovie);
router.get('/:commentId', CommentController.getCommentById);

// Protected routes
router.post('/', authMiddleware, CommentController.createComment);
router.put('/:commentId', authMiddleware, CommentController.updateComment);
router.delete('/:commentId', authMiddleware, CommentController.deleteComment);

export default router;
