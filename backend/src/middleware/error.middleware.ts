import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../utils/response.js'

export const notFoundHandler = (_req: Request, res: Response) => {
  return sendError(res, 'Endpoint no encontrado', 404)
}

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  return sendError(res, 'Error interno del servidor', 500)
}
