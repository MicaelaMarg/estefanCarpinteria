import bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { sendError, sendSuccess } from '../utils/response.js'

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      return sendError(res, 'Email y contraseña son obligatorios', 400)
    }

    if (email !== env.adminEmail) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const isValidPassword = env.adminPasswordHash
      ? await bcrypt.compare(password, env.adminPasswordHash)
      : password === env.adminPassword

    if (!isValidPassword) {
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const token = jwt.sign(
      {
        sub: 1,
        email,
        role: 'admin',
      },
      env.jwtSecret,
      { expiresIn: '2h' },
    )

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: 1,
          email,
          name: 'Administrador',
        },
      },
      1,
      'Login exitoso',
    )
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo iniciar sesión', 500)
  }
}
