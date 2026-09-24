import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Routes a rejected promise to Express's error handler — Express 4 doesn't do this itself. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
