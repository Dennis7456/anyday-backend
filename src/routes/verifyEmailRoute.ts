import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { graphql } from 'graphql'
import { schema } from '../schema'
import { contextFactory } from '../context'

interface VerifyEmailQuery {
  token: string
}

interface VerifyEmailResponse {
  verifyEmail: {
    valid: boolean
    message: string
    redirectUrl: string
    token: string
  }
}

export function registerVerifyEmailRoute(server: FastifyInstance) {
  // Server Status Endpoint
  server.route({
    method: 'GET',
    url: '/verify-email',
    handler: async (req: FastifyRequest, resp: FastifyReply) => {
      const query = req.query as VerifyEmailQuery
      const token = query.token

      if (!token) {
        resp.status(400).send({ error: 'Token is required' })
        return
      }

      try {
        // Execute GraphQL mutation directly
        const result = await graphql({
          schema,
          source: `
            mutation verifyEmail($token: String!) {
              verifyEmail(token: $token) {
                valid
                message
                redirectUrl
                token
              }
            }
          `,
          variableValues: { token },
          contextValue: await contextFactory(req),
        })

        if (result.errors) {
          console.error('GraphQL Errors:', result.errors)
          resp.status(400).send({ error: 'Verification failed' })
          return
        }

        // Safe type assertion and handling
        const data = result.data as unknown

        if (data && typeof data === 'object' && 'verifyEmail' in data) {
          const { valid, message, redirectUrl, token } = (
            data as VerifyEmailResponse
          ).verifyEmail
          if (valid) {
            // Return a JSON response with the redirect URL
            resp.header('Set-Cookie', `token=${token}; Path=/;`)
            resp.redirect(redirectUrl || '/')
          } else {
            resp.status(400).send(message || 'Verification failed')
          }
        } else {
          resp.status(400).send('Invalid response structure')
        }
      } catch (error) {
        console.error('Verification Error', error)
        resp.status(500).send({ error: 'Internal Server Error' })
      }
    },
  })
}
