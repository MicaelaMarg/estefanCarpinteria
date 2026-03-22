import bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface AdminUserRow extends RowDataPacket {
  id: number
  email: string
  password_hash: string
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      return sendError(res, 'Email y contraseña son obligatorios', 400)
    }

    const emailNorm = email.trim().toLowerCase()

    const [rows] = await pool.query<AdminUserRow[]>(
      'SELECT id, email, password_hash FROM admin_users WHERE LOWER(email) = ? LIMIT 1',
      [emailNorm],
    )
    const dbUser = rows[0]

    if (dbUser) {
      const isValidPassword = await bcrypt.compare(password, dbUser.password_hash)
      if (!isValidPassword) {
        return sendError(res, 'Credenciales inválidas', 401)
      }

      const token = jwt.sign(
        {
          sub: dbUser.id,
          email: dbUser.email,
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
            id: dbUser.id,
            email: dbUser.email,
            name: 'Administrador',
          },
        },
        1,
        'Login exitoso',
      )
    }

    // Sin fila en MySQL: compatibilidad con variables de entorno (migraciones / dev)
    if (emailNorm !== env.adminEmail.trim().toLowerCase()) {
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
        email: env.adminEmail,
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
          email: env.adminEmail,
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
