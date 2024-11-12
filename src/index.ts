import 'graphql-import-node'
import fastify from 'fastify'
import {
  getGraphQLParameters,
  processRequest,
  Request,
  sendResult,
  shouldRenderGraphiQL,
  renderGraphiQL,
} from 'graphql-helix'
import { schema } from './schema'
import { contextFactory } from './context'

export function createServer() {
  const server = fastify()

  server.route({
    method: ['POST', 'GET'],
    url: '/graphql',
    handler: async (req, reply) => {
      const request: Request = {
        headers: req.headers,
        method: req.method,
        query: req.query,
        body: req.body,
      }

      console.log('Request headers', request.headers)
      console.log('Request method', request.method)
      console.log('Request query', request.query)
      console.log('Request body', request.body)

      if (shouldRenderGraphiQL(request)) {
        // Render the GraphiQL interface if conditions are met
        const responseBody = renderGraphiQL({
          endpoint: '/graphql',
        })

        reply.header('Content-Type', 'text/html')
        reply.status(200)
        reply.send(responseBody)

        return
      }

      const { operationName, query, variables } = getGraphQLParameters(request)

      const result = await processRequest({
        request,
        schema,
        operationName,
        contextFactory,
        query,
        variables,
      })

      sendResult(result, reply.raw)
    },
  })

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
