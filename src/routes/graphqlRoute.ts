import {
  getGraphQLParameters,
  processRequest,
  Request,
  // sendResult,
  shouldRenderGraphiQL,
  renderGraphiQL,
} from 'graphql-helix'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { schema } from '../schema'
import { contextFactory } from '../context/context'

// Define and export the route as a function
export function registerGraphQLRoute(server: FastifyInstance) {
  server.route({
    method: ['POST', 'GET', 'OPTIONS'],
    url: '/graphql',

    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        reply
          .header('Access-Control-Allow-Origin', req.headers.origin || '*')
          .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          .status(204)
          .send()
        return
      }

      // Set CORS headers for other requests
      reply
        .header('Access-Control-Allow-Origin', req.headers.origin || '*')
        .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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
        contextFactory: () => contextFactory(req),
        query,
        variables,
      })

      if (result.type === 'RESPONSE') {
        result.headers.forEach(({ name, value }) => {
          reply.header(name, value)
        })
        reply.status(result.status)
        reply.serialize(result.payload)
        reply.send(result.payload)
        // console.log(reply)
      }
      // sendResult(result, reply.raw)
      // console.log(result, reply.raw)
    },
  })
}
