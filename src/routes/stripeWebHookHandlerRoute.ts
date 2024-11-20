import { FastifyInstance, FastifyRequest } from 'fastify'
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client/core'
import { sendPaymentConfirmationEmail } from '../services/sendPaymentConfirmationEmail'
import fetch from 'cross-fetch'
import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

export async function registerStripeWebHookHandlerRoute(app: FastifyInstance) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set.')
  }

  if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set.')
  }

  // Initialize Stripe client
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-10-28.acacia',
  })

  // Initialize ApolloClient
  const apolloClient = new ApolloClient({
    link: new HttpLink({
      uri: 'https://your-graphql-endpoint.com',
      fetch,
      headers: {
        authorization: `Bearer ${process.env.GRAPHQL_API_KEY}`,
      },
    }),
    cache: new InMemoryCache(),
  })

  // Define GraphQL mutations
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

  // Capture raw body before Fastify parses it
  app.addHook('onRequest', (request: FastifyRequest, reply, done) => {
    const body: Buffer[] = [] // Explicitly type as Buffer array

    // Collect the body chunks
    request.raw.on('data', (chunk: Buffer) => {
      body.push(chunk)
    })

    // Once the body is collected, convert it to a buffer and assign it to request.rawBody
    request.raw.on('end', () => {
      request.rawBody = Buffer.concat(body)
      done() // Ensure to call done to signal that the request is ready for processing
    })

    // In case of error during request body handling
    request.raw.on('error', (err: Error) => {
      reply.status(400).send('Error reading request body')
      done(err) // Pass the error to Fastify to handle it
    })
  })

  // Define webhook route without body parsing
  app.route({
    method: 'POST',
    url: '/webhooks/stripe',
    config: {
      bodyLimit: 0, // Disable automatic body parsing
    },
    handler: async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string
      const rawBody = request.rawBody as Buffer

      // Ensure rawBody is available for signature verification
      if (!rawBody) {
        throw new Error('No raw body provided.')
      }

      try {
        // Verify the webhook signature
        const event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          stripeWebhookSecret
        )

        // Handle the checkout session completed event
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session
          const orderId = session.client_reference_id || ''
          const customerEmail = session.customer_email || ''
          const transactionId = session.id
          const amount = session.amount_total || 0

          console.log('Processing checkout.session.completed event:', {
            orderId,
            customerEmail,
            transactionId,
            amount,
          })

          try {
            // Execute the CreatePayment mutation
            await apolloClient.mutate({
              mutation: CREATE_PAYMENT_MUTATION,
              variables: {
                orderId,
                amount,
                paymentStatus: 'COMPLETED',
                transactionId,
              },
            })

            // Execute the UpdateOrderStatus mutation
            await apolloClient.mutate({
              mutation: UPDATE_ORDER_STATUS_MUTATION,
              variables: {
                orderId,
                status: 'IN_PROGRESS',
              },
            })

            // Send payment confirmation email
            await sendPaymentConfirmationEmail(customerEmail, orderId)
          } catch (error) {
            console.error(
              'Error in processing GraphQL mutations or email sending:',
              error instanceof Error ? error.message : 'Unknown error'
            )
          }
        } else {
          // Log unsupported events
          console.log(`Received unsupported event type: ${event.type}`)
        }

        // Respond with acknowledgment for all valid events
        reply.status(200).send({ received: true })
      } catch (error) {
        console.error('Webhook error:', error)
        reply
          .status(400)
          .send(
            `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
      }
    },
  })
}
