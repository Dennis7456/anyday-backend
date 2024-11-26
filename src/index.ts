import 'graphql-import-node'
import Fastify, { FastifyInstance } from 'fastify'
import dotenv from 'dotenv'
import { AddressInfo } from 'net'
import cors from '@fastify/cors'
import fastifyFormBody from '@fastify/formbody'
// import FastifyMultipart from '@fastify/multipart';
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
// import fastifyMultipart from '@fastify/multipart';

dotenv.config()

// Initialize Fastify application
export const app: FastifyInstance = Fastify({
  logger: true,
})

// Normalize allowed origins
const allowedOrigins = [
  // process.env.FRONTEND_URL,
  'https://anydayessay.com',
  'https://anyday-essay-client.web.app',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://anyday-backend-gcloudrun-969666510139.us-central1.run.app/graphql',
].filter(Boolean)

app.register(cors, {
  origin: (origin, cb) => {
    console.log('Incoming Origin:', origin)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      console.error('CORS Denied for:', origin)
      cb(new Error('CORS Error: Origin not allowed'), false)
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

app.register(fastifyFormBody)
if (!app.hasDecorator('multipartErrors')) {
  // app.register(FastifyMultipart);
}
app.addHook('onRequest', (req, reply, done) => {
  console.log(`[${req.method}] ${req.url}`)
  if (req.method === 'OPTIONS') {
    // console.log('Preflight Request:', req.headers.origin)
  }
  if (req.body) console.log('Body:', req.body)
  if (req.headers) console.log('Headers:', req.headers)

  console.log('--- Incoming Request ---')
  console.log(`[${req.method}] ${req.url}`)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  console.log('Query Params:', req.query)
  console.log('--- End of Request ---')
  done()
})

app.setErrorHandler((error, request, reply) => {
  const origin = request.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin)
  }
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  reply.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )

  // Log the error for debugging
  app.log.error(error)

  // Send the error response
  reply.status(500).send({ error: error.message })
})

// Route registration
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
      console.log(`Registered route: ${name}`)
    } catch (err) {
      console.error(`Error registering route ${name}:`, err)
    }
  })
}

// Start the server
const start = async () => {
  try {
    registerRoutes()
    const address = await app.listen({ port: 8080, host: '0.0.0.0' })
    const portInfo =
      typeof address === 'string' ? address : (address as AddressInfo).port
    console.log(`Server running at port ${portInfo}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
