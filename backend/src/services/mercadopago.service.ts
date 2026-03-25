import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import { env } from '../config/env.js'

function requireToken(): string {
  if (!env.mercadopagoAccessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')
  }
  return env.mercadopagoAccessToken
}

export function getMpConfig(): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: requireToken() })
}

export function getPreferenceApi(): Preference {
  return new Preference(getMpConfig())
}

export function getPaymentApi(): Payment {
  return new Payment(getMpConfig())
}
