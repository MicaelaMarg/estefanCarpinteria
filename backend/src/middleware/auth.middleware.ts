import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { sendError } from '../utils/response.js'

export interface AdminAuthPayload {
  sub: number
  email: string
  role: string
}

export interface AuthRequest extends Request {
  auth?: AdminAuthPayload
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return sendError(res, 'No autorizado', 401)
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as unknown as AdminAuthPayload
    if (payload.role !== 'admin') {
      return sendError(res, 'No autorizado', 403)
    }
    req.auth = payload
    return next()
  } catch {
    return sendError(res, 'Token inválido o expirado', 401)
  }
}
