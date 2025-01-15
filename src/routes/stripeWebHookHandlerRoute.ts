import { FastifyInstance } from 'fastify'
import { stripeClient } from './client/stripeClient'
import Stripe from 'stripe'
import {
  ApolloClient,
  // InMemoryCache,
  // HttpLink,
} from '@apollo/client/core'
import gql from 'graphql-tag'
import { sendPaymentConfirmationEmail } from '../services/sendPaymentConfirmationEmail'
// import fetch from 'cross-fetch';
import dotenv from 'dotenv'
import { StatusCodes } from 'http-status-codes'

dotenv.config()

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const backendUrl = process.env.BACKEND_URL

if (!stripeWebhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set.')
}

if (!backendUrl) {
  throw new Error('BACKEND_URL environment variable is not set.')
}

const webhookSecret: string = stripeWebhookSecret

export async function registerStripeWebHookHandlerRoute(
  app: FastifyInstance,
  apolloClient: ApolloClient<any>
) {
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body: string, done) => {
      ;(req as any).rawBody = body
      try {
        const json = JSON.parse(body)
        done(null, json)
      } catch (err) {
        const error = err as Error
        error.message = 'Invalid JSON'
        ;(error as any).statusCode = StatusCodes.BAD_REQUEST
        done(error, undefined)
      }
    }
  )

  // const apolloClient = new ApolloClient({
  //   link: new HttpLink({
  //     uri: backendUrl,
  //     fetch,
  //     headers: {
  //       authorization: `Bearer ${process.env.GRAPHQL_API_KEY}`,
  //     },
  //   }),
  //   cache: new InMemoryCache(),
  // });

  const CREATE_PAYMENT_MUTATION = gql`
    mutation CreatePayment(
      $orderId: String!
      $amount: Float!
      $paymentStatus: PaymentStatus!
      $transactionId: String!
    ) {
      createPayment(
        orderId: $orderId
        amount: $amount
        paymentStatus: $paymentStatus
        transactionId: $transactionId
      ) {
        id
        amount
        paymentStatus
      }
    }
  `

  const UPDATE_ORDER_STATUS_MUTATION = gql`
    mutation UpdateOrderStatus($orderId: String!, $status: OrderStatus!) {
      updateOrderStatus(orderId: $orderId, status: $status) {
        id
        status
      }
    }
  `

  app.post('/webhooks/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature']

    if (!sig || typeof sig !== 'string') {
      reply
        .status(StatusCodes.BAD_REQUEST)
        .send('Missing or invalid Stripe signature.')
      return
    }

    const rawBody = (request as any).rawBody as string

    if (!rawBody) {
      reply.status(StatusCodes.BAD_REQUEST).send('No raw body provided.')
      return
    }

    try {
      const event = stripeClient.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret
      )

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const orderId = session.client_reference_id || ''
          const customerEmail = session.customer_email || ''
          const transactionId = session.id
          const amount = (session.amount_total || 0) / 100

          console.log('Processing checkout.session.completed event:', {
            orderId,
            customerEmail,
            transactionId,
            amount,
          })

          try {
            await apolloClient.mutate({
              mutation: CREATE_PAYMENT_MUTATION,
              variables: {
                orderId,
                amount,
                paymentStatus: 'COMPLETED',
                transactionId,
              },
            })

            await apolloClient.mutate({
              mutation: UPDATE_ORDER_STATUS_MUTATION,
              variables: {
                orderId,
                status: 'IN_PROGRESS',
              },
            })

            await sendPaymentConfirmationEmail(customerEmail, orderId)
          } catch (error) {
            console.error('Error processing GraphQL or email:', error)
            reply
              .status(StatusCodes.INTERNAL_SERVER_ERROR)
              .send('Internal server error.')
            return
          }
          break
        }
        default:
          console.log(`Received unsupported event type: ${event.type}`)
          break
      }

      reply.status(StatusCodes.OK).send({ received: true })
    } catch (error) {
      console.error('Webhook error:', error)
      reply.status(StatusCodes.BAD_REQUEST).send({
        error: `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  })
}
