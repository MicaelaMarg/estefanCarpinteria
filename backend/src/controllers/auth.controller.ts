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

/** MySQL: tabla inexistente (migración 003 no aplicada en Railway, etc.) */
function isMissingAdminUsersTable(err: unknown): boolean {
  const e = err as { errno?: number; code?: string }
  return e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE'
}

async function findAdminUserByEmail(emailNorm: string): Promise<AdminUserRow[] | null> {
  try {
    const [rows] = await pool.query<AdminUserRow[]>(
      'SELECT id, email, password_hash FROM admin_users WHERE LOWER(email) = ? LIMIT 1',
      [emailNorm],
    )
    return rows
  } catch (err) {
    if (isMissingAdminUsersTable(err)) {
      console.warn(
        '[auth] Tabla admin_users no existe; usá migración 003_admin_users.sql o login por ADMIN_EMAIL en .env',
      )
      return null
    }
    throw err
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      return sendError(res, 'Email y contraseña son obligatorios', 400)
    }

    const emailNorm = email.trim().toLowerCase()

    const rows = await findAdminUserByEmail(emailNorm)
    if (rows !== null) {
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
    }

    // Sin tabla admin_users, o tabla vacía / sin fila: variables de entorno
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
