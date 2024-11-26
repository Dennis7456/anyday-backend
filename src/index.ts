import 'graphql-import-node'
import Fastify, { FastifyInstance } from 'fastify'
import dotenv from 'dotenv'
import { AddressInfo } from 'net'
// import fastifyCors from '@fastify/cors' // Import Fastify CORS plugin
import cors from '@fastify/cors'
import { registerIndexRoute } from './routes/indexRoute'
import { registerGraphQLRoute } from './routes/graphqlRoute'
import { registerGetRedisDataRoute } from './routes/getRedisDataRoute'
import { registerUploadFilesRoute } from './routes/uploadFilesRoute'
import { registerListFilesRoute } from './routes/showFileRoute'
import { registerCreateStripePaymentSessionRoute } from './routes/createStripeSessionRoute'
import { registerStripeWebHookHandlerRoute } from './routes/stripeWebHookHandlerRoute'
import { apolloClient } from './routes/client/apolloClient'
import redisClient from './services/redisClient'

dotenv.config()

// Initialize Fastify application
export const app: FastifyInstance = Fastify({
  logger: true,
})

console.log('FRONTEND_URL:', process.env.FRONTEND_URL)

app.register(cors, {
  origin: (origin, cb) => {
    console.log('Incoming Origin:', origin)
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://anydayessay.com',
      'https://anyday-essay-client.web.app',
      'http://localhost:3000',
      'https://anyday-backend-gcloudrun-969666510139.us-central1.run.app/graphql',
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'), false)
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

app.addHook('onRequest', (req, reply, done) => {
  console.log('Request Method:', req.method)
  console.log('Request URL:', req.url)
  console.log('Request Body:', req.body)
  console.log('Request Headers:', req.headers)
  done()
})

// Function to register routes with error handling
const registerRoutes = () => {
  try {
    registerIndexRoute(app)
    console.log('Registered index route')
  } catch (err) {
    console.error('Error registering index route:', err)
  }

  try {
    registerGraphQLRoute(app)
    console.log('Registered GraphQL route')
  } catch (err) {
    console.error('Error registering GraphQL route:', err)
  }

  try {
    registerGetRedisDataRoute(app, redisClient)
    console.log('Registered Get Redis Data route')
  } catch (err) {
    console.error('Error registering Get Redis Data route:', err)
  }

  try {
    registerUploadFilesRoute(app)
    console.log('Registered Upload Files route')
  } catch (err) {
    console.error('Error registering Upload Files route:', err)
  }

  try {
    registerListFilesRoute(app)
    console.log('Registered List Files route')
  } catch (err) {
    console.error('Error registering List Files route:', err)
  }

  try {
    registerCreateStripePaymentSessionRoute(app)
    console.log('Registered Create Stripe Payment Session route')
  } catch (err) {
    console.error('Error registering Create Stripe Payment Session route:', err)
  }

  try {
    registerStripeWebHookHandlerRoute(app, apolloClient)
    console.log('Registered Stripe WebHook Handler route')
  } catch (err) {
    console.error('Error registering Stripe WebHook Handler route:', err)
  }
}

// Start the server
const start = async () => {
  try {
    // Register all routes
    registerRoutes()

    // Bind server to 0.0.0.0 to allow external access in Cloud Run
    const address = await app.listen({ port: 8080, host: '0.0.0.0' })
    if (typeof address !== 'string') {
      const addr = address as AddressInfo
      console.log(`Server listening on ${addr.port}`)
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Run the server
start()
