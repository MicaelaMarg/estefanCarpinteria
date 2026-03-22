import multer from 'multer'

const fiveMb = 5 * 1024 * 1024

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: fiveMb },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten archivos de imagen'))
      return
    }
    cb(null, true)
  },
})
