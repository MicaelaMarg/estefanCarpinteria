import { Router } from 'express'
import multer from 'multer'
import { listAdminOrders } from '../controllers/admin-orders.controller.js'
import {
  createAdminProduct,
  deleteAdminProduct,
  ingresoMercaderia,
  listAdminProducts,
  updateAdminProduct,
} from '../controllers/admin-products.controller.js'
import { uploadProductImage } from '../controllers/admin-upload.controller.js'
import { requireAdmin } from '../middleware/auth.middleware.js'
import { uploadImage } from '../middleware/upload.middleware.js'
import { sendError } from '../utils/response.js'

const adminRouter = Router()

adminRouter.use(requireAdmin)

adminRouter.get('/orders', listAdminOrders)
adminRouter.get('/products', listAdminProducts)
adminRouter.post('/products', createAdminProduct)
adminRouter.post('/products/:id/stock-ingreso', ingresoMercaderia)
adminRouter.patch('/products/:id', updateAdminProduct)
adminRouter.delete('/products/:id', deleteAdminProduct)

adminRouter.post(
  '/upload',
  (req, res, next) => {
    uploadImage.single('image')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'La imagen supera el máximo de 5 MB', 400)
      }
      if (err instanceof Error) {
        return sendError(res, err.message, 400)
      }
      return next()
    })
  },
  uploadProductImage,
)

export default adminRouter
