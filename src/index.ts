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

async function main() {
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

      if (shouldRenderGraphiQL(request)) {
        reply.header('Content-Type', 'text/html')
        reply.send(
          renderGraphiQL({
            endpoint: '/graphql',
          })
        )

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

  try {
    await server.listen({ port: 4000, host: '0.0.0.0' })
    console.log(`Server is running on http://localhost:4000/`)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

main()
