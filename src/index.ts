import 'graphql-import-node'
import fastify from 'fastify'
import dotenv from 'dotenv'
// import {
//   getGraphQLParameters,
//   processRequest,
//   Request,
//   sendResult,
//   shouldRenderGraphiQL,
//   renderGraphiQL,
// } from 'graphql-helix'
import multipart from '@fastify/multipart'
// import { schema } from './schema'
// import { contextFactory } from './context/context'
import { registerIndexRoute } from './routes/indexRoute'
import { registerGraphQLRoute } from './routes/graphqlRoute'
import { registerGetRedisDataRoute } from './routes/getRedisDataRoute'
import { registerUploadFilesRoute } from './routes/uploadFilesRoute'

dotenv.config()

export function createServer() {
  const server = fastify()
  server.register(multipart)
  // Registered routes
  registerIndexRoute(server)
  registerGraphQLRoute(server)
  registerGetRedisDataRoute(server)
  registerUploadFilesRoute(server)

  return server
}

if (require.main === module) {
  ;(async () => {
    try {
      const server = createServer()
      await server.listen({ port: 4000, host: '0.0.0.0' })
      console.log(`Server is running on http://localhost:4000/`)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })()
}
