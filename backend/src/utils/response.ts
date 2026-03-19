import type { Response } from 'express'
import type { ApiResponse } from '../types/api.js'

export const sendSuccess = <T>(res: Response, data: T, total = 0, message = '') => {
  const payload: ApiResponse<T> = {
    status: 'success',
    data,
    total,
    message,
  }

  return res.json(payload)
}

export const sendError = (res: Response, message: string, statusCode = 400) => {
  return res.status(statusCode).json({
    status: 'error',
    data: [],
    total: 0,
    message,
  })
}
