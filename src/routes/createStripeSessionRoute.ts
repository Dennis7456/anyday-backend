import { FastifyInstance, FastifyRequest } from 'fastify'
// import { Storage } from '@google-cloud/storage'
// import mime from 'mime-types'
// import path from 'path'
// import fs from 'fs'
// import fastifyStatic from '@fastify/static'
import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

// Define the type for the request body
interface CreateSessionRequestBody {
  orderId: string
  amount: number
  paymentType: 'deposit' | 'full'
}

export function registerCreateStripePaymentSessionRoute(app: FastifyInstance) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set.')
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-10-28.acacia',
  })
  app.route({
    method: 'POST',
    url: '/api/payment/create-session',
    schema: {
      body: {
        type: 'object',
        required: ['orderId', 'amount', 'paymentType'],
        properties: {
          orderId: { type: 'string' },
          amount: { type: 'number', minimum: 1 },
          paymentType: { type: 'string', enum: ['deposit', 'full'] },
        },
      },
    },
    handler: async (
      req: FastifyRequest<{ Body: CreateSessionRequestBody }>,
      reply
    ) => {
      const { orderId, amount, paymentType } = req.body ?? {} // Fallback to an empty object if body is undefined

      // Validate required fields
      if (
        !orderId ||
        typeof orderId !== 'string' ||
        orderId.trim().length === 0
      ) {
        return reply.status(400).send({ error: 'Invalid or missing orderId' })
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return reply.status(400).send({ error: 'Invalid or missing amount' })
      }
      if (!['deposit', 'full'].includes(paymentType)) {
        return reply
          .status(400)
          .send({ error: 'Invalid or missing paymentType' })
      }

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card', 'alipay', 'cashapp', 'link'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Order Payment - ${paymentType === 'deposit' ? 'Deposit' : 'Full Amount'}`,
                },
                unit_amount: amount * 100, // Convert to cents
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.BASE_URL}/payment-success?orderId=${orderId}`,
          cancel_url: `${process.env.BASE_URL}/payment-cancel?orderId=${orderId}`,
        })

        reply.send({ url: session.url })
      } catch (error: unknown) {
        // Check if the error is an instance of Error
        if (error instanceof Error) {
          // Handle Stripe specific errors or generic errors
          // console.error('Stripe Session Error:', error.message);

          // Additional check for Stripe errors
          if ((error as Stripe.errors.StripeError).statusCode) {
            const stripeError = error as Stripe.errors.StripeError
            console.error('Stripe Error Status Code:', stripeError.statusCode)
          }

          reply.status(500).send({ error: 'Error creating payment session' })
        } else {
          // Handle unexpected errors (e.g., non-Error objects)
          console.error('Unexpected Error:', error)
          reply.status(500).send({ error: 'Unexpected error occurred' })
        }
      }
    },
  })
}
