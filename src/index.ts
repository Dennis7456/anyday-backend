import 'graphql-import-node'
import Fastify, { FastifyInstance } from 'fastify'
import dotenv from 'dotenv'
import { registerIndexRoute } from './routes/indexRoute'
import { registerGraphQLRoute } from './routes/graphqlRoute'
import { registerGetRedisDataRoute } from './routes/getRedisDataRoute'
import { registerUploadFilesRoute } from './routes/uploadFilesRoute'
import { AddressInfo } from 'net'
import { registerListFilesRoute } from './routes/showFileRoute'
import { registerCreateStripePaymentSessionRoute } from './routes/createStripeSessionRoute'
import { registerStripeWebHookHandlerRoute } from './routes/stripeWebHookHandlerRoute'
import { apolloClient } from './routes/client/apolloClient'

dotenv.config()

export const app: FastifyInstance = Fastify({
  logger: true,
})

// Registered routes
registerIndexRoute(app)
registerGraphQLRoute(app)
registerGetRedisDataRoute(app)
registerUploadFilesRoute(app)
registerListFilesRoute(app)
registerCreateStripePaymentSessionRoute(app)
registerStripeWebHookHandlerRoute(app, apolloClient)

const start = async () => {
  try {
    const address = await app.listen({ port: 8080 })
    if (typeof address !== 'string') {
      const addr = address as AddressInfo
      console.log(`server listening on ${addr.port}`)
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
