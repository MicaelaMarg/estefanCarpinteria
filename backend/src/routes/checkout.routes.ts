import { Router } from 'express'
import { getShippingOptions, postCheckout } from '../controllers/checkout.controller.js'

const checkoutRouter = Router()

checkoutRouter.get('/shipping', getShippingOptions)
checkoutRouter.post('/', postCheckout)

export default checkoutRouter
