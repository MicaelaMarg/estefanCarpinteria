import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Response } from 'express'
import sharp from 'sharp'
import { env, toPublicAssetUrl } from '../config/env.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { sendError, sendSuccess } from '../utils/response.js'

type UploadRequest = AuthRequest & { file?: Express.Multer.File }

const MAX_WIDTH = 1920
const WEBP_QUALITY = 80

export const uploadProductImage = async (req: UploadRequest, res: Response) => {
  try {
    const file = req.file
    if (!file?.buffer) {
      return sendError(res, 'Archivo de imagen requerido', 400)
    }

    const filename = `${randomUUID()}.webp`
    const dest = path.join(env.uploadDir, filename)

    await sharp(file.buffer)
      .rotate()
      .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(dest)

    const relativePath = `/uploads/${filename}`
    const url = toPublicAssetUrl(relativePath)

    return sendSuccess(res, { url }, 1, 'Imagen subida')
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo procesar la imagen', 500)
  }
}
