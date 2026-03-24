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
        // Solo recortar espacios/saltos accidentales del panel SQL; el hash en sí no lleva espacios internos.
        const storedHash = (dbUser.password_hash ?? '').replace(/^\s+|\s+$/g, '')
        if (!storedHash) {
          console.warn('[auth] password_hash vacío en admin_users:', dbUser.email)
          return sendError(res, 'Credenciales inválidas', 401)
        }
        if (storedHash.length !== 60 || !storedHash.startsWith('$2')) {
          console.error(
            '[auth] HASH_STORAGE_INVALID len=%d prefix=%s email=%s — bcrypt en MySQL debe ser 60 chars y empezar con $2. Usá Query + CONCAT(CHAR(36),...) (npm run hash-password / admin-bootstrap-sql).',
            storedHash.length,
            JSON.stringify(storedHash.slice(0, 4)),
            dbUser.email,
          )
          return sendError(res, 'Credenciales inválidas', 401)
        }
        const isValidPassword = await bcrypt.compare(password, storedHash)
        if (!isValidPassword) {
          console.warn('[auth] Contraseña incorrecta para usuario en admin_users:', dbUser.email)
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

    // Sin fila en admin_users para este email: respaldo con variables de entorno
    if (emailNorm !== env.adminEmail.trim().toLowerCase()) {
      console.warn(
        '[auth] Sin coincidencia en admin_users y email distinto de ADMIN_EMAIL. Login:',
        emailNorm,
        'ADMIN_EMAIL:',
        env.adminEmail,
      )
      return sendError(res, 'Credenciales inválidas', 401)
    }

    const isValidPassword = env.adminPasswordHash
      ? await bcrypt.compare(password, env.adminPasswordHash)
      : password === env.adminPassword

    if (!isValidPassword) {
      console.warn(
        '[auth] Contraseña incorrecta (fallback ADMIN_EMAIL / ADMIN_PASSWORD). Si admin_users está vacía, la clave por defecto en código es admin1234 salvo que definas ADMIN_PASSWORD en Railway.',
      )
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
    const e = error as { code?: string; errno?: number; message?: string }
    if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.code === 'ENOTFOUND') {
      console.error('[auth] MySQL no alcanzable:', e.code, e.message)
    } else {
      console.error('[auth]', error)
    }
    return sendError(res, 'No se pudo iniciar sesión', 500)
  }
}
