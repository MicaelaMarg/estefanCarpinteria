import { Router } from 'express'
import { getShippingOptions, postCheckout, postShippingQuote } from '../controllers/checkout.controller.js'

const checkoutRouter = Router()

checkoutRouter.get('/shipping', getShippingOptions)
checkoutRouter.post('/shipping/quote', postShippingQuote)
checkoutRouter.post('/', postCheckout)

export default checkoutRouter
