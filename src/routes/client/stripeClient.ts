import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set.')
}

export const stripeClient = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
})
