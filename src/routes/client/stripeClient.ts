import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set.')
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-10-28.acacia',
})
