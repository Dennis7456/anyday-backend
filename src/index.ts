import 'graphql-import-node'
import Fastify, { FastifyInstance } from 'fastify'
import dotenv from 'dotenv'
import { AddressInfo } from 'net'
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
import { registerVerifyEmailRoute } from './routes/verifyEmailRoute'

dotenv.config()

// Initialize Fastify application
export const app: FastifyInstance = Fastify({
  logger: true,
})

// CORS Configuration
// const allowedOrigins = [
//   process.env.FRONTEND_URL,
//   'https://anydayessay.com',
//   'https://anyday-essay-client.web.app',
//   'http://localhost:3000',
//   'https://anyday-backend-gcloudrun-969666510139.us-central1.run.app/graphql',
// ].filter(Boolean) // Remove undefined/null origins

app.register(cors, {
  origin: ['https://anydayessay.com', 'https://anyday-essay-client.web.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  // origin: (origin, cb) => {
  //   console.log('Incoming Origin:', origin)
  //   if (!origin || allowedOrigins.includes(origin)) {
  //     cb(null, true)
  //   } else {
  //     console.error('CORS Denied for:', origin)
  //     cb(new Error('CORS Error: Origin not allowed'), false)
  //   }
  // },
  // methods: ['GET', 'POST', 'OPTIONS'],
  // allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: true,
})

app.addHook('onRequest', (req, reply, done) => {
  console.log(`[${req.method}] ${req.url}`)
  if (req.body) console.log('Body:', req.body)
  if (req.headers) console.log('Headers:', req.headers)
  done()
})

// Centralized Route Registration
const routes: { handler: (app: FastifyInstance) => void; name: string }[] = [
  { handler: registerIndexRoute, name: 'Index' },
  { handler: registerGraphQLRoute, name: 'GraphQL' },
  {
    handler: (app) => registerGetRedisDataRoute(app, redisClient),
    name: 'Get Redis Data',
  },
  { handler: registerUploadFilesRoute, name: 'Upload Files' },
  { handler: registerListFilesRoute, name: 'List Files' },
  {
    handler: registerCreateStripePaymentSessionRoute,
    name: 'Create Stripe Payment Session',
  },
  {
    handler: (app) => registerStripeWebHookHandlerRoute(app, apolloClient),
    name: 'Stripe WebHook Handler',
  },
  { handler: registerVerifyEmailRoute, name: 'Verify Email' },
]

const registerRoutes = () => {
  routes.forEach(({ handler, name }) => {
    try {
      handler(app)
      console.log(`Registered ${name} route`)
    } catch (err) {
      console.error(`Error registering ${name} route:`, err)
    }
  })
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
      console.log(`Server listening on port ${addr.port}`)
    } else {
      console.log(`Server listening at ${address}`)
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Run the server
start()
