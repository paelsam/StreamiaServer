import { z } from 'zod';

// ========== ESQUEMAS DE PARÁMETROS ==========

/**
 * Valida el movieId en los parámetros de la ruta
 */
export const movieIdSchema = z.object({
  movieId: z.string()
    .min(1, 'El ID de la película es requerido')
    .regex(/^[0-9a-fA-F]{24}$/, 'ID de película inválido (debe ser un ObjectId de MongoDB)')
});

// ========== ESQUEMAS DE QUERY ==========

/**
 * Valida los parámetros de query para paginación y ordenamiento
 */
export const favoritesQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => val > 0, 'La página debe ser mayor a 0'),
  
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 20)
    .refine(val => val > 0 && val <= 100, 'El límite debe estar entre 1 y 100'),
  
  sortBy: z.enum(['createdAt', 'updatedAt', 'movieId'])
    .optional()
    .default('createdAt'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

// ========== ESQUEMAS DE BODY ==========

/**
 * Valida el body para agregar un favorito (con nota opcional)
 * El body debe ser un objeto, pero la nota es opcional
 */
export const addFavoriteBodySchema = z.object({
  note: z.string()
    .max(500, 'La nota no puede exceder 500 caracteres')
    .optional()
});

/**
 * Valida el body para actualizar la nota de un favorito
 */
export const updateFavoriteBodySchema = z.object({
  note: z.string()
    .max(500, 'La nota no puede exceder 500 caracteres')
});

// ========== TIPOS INFERIDOS ==========

export type MovieIdParams = z.infer<typeof movieIdSchema>;
export type FavoritesQuery = z.infer<typeof favoritesQuerySchema>;
export type AddFavoriteBody = z.infer<typeof addFavoriteBodySchema>;
export type UpdateFavoriteBody = z.infer<typeof updateFavoriteBodySchema>;