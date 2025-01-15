import { FastifyInstance, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

interface CreateSessionRequestBody {
  orderId: string
  amount: number
  paymentType: 'deposit' | 'full'
}

export function registerCreateStripePaymentSessionRoute(
  app: FastifyInstance,
  stripeClient?: Stripe
) {
  const stripe =
    stripeClient ||
    new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia',
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
      const { orderId, amount, paymentType } = req.body

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
                unit_amount: amount * 100,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.BASE_URL}/payment-success?orderId=${orderId}`,
          cancel_url: `${process.env.BASE_URL}/payment-cancel?orderId=${orderId}`,
        })

        reply.send({ url: session.url })
      } catch (error) {
        reply.status(500).send({ error: 'Error creating payment session' })
        console.error(error)
      }
    },
  })
}
