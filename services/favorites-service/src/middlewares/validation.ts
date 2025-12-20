import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware genérico para validar con Zod
 */
const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message
            }))
          }
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Valida el body de la request
 */
export const validateBody = (schema: AnyZodObject) => validate(schema, 'body');

/**
 * Valida los query params de la request
 */
export const validateQuery = (schema: AnyZodObject) => validate(schema, 'query');

/**
 * Valida los route params de la request
 */
export const validateParams = (schema: AnyZodObject) => validate(schema, 'params');