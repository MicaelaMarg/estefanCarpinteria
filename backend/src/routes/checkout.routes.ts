import { Router } from 'express'
import { postCheckout } from '../controllers/checkout.controller.js'

const checkoutRouter = Router()

checkoutRouter.post('/', postCheckout)

export default checkoutRouter
