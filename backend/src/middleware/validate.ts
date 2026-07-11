import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

// Validates req.body against a zod schema; replaces it with the parsed
// (stripped/coerced) value on success.
export const validate = (schema: ZodType) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Invalid request body',
                details: result.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`),
            });
            return;
        }
        req.body = result.data;
        next();
    };
