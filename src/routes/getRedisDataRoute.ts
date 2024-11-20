import { FastifyInstance } from 'fastify'
import { redisClient } from '../services/redisClient'

export function registerGetRedisDataRoute(server: FastifyInstance) {
  server.route({
    method: 'POST',
    url: '/api/redis/user-data',
    handler: async (req, reply) => {
      const token = req.headers.authorization?.split(' ')[1]
      // console.log(req.headers)
      if (!token) {
        reply.status(401).send('Token is required')
        return
      }

      try {
        const userData = await redisClient.get(token)

        if (userData) {
          reply.send(JSON.parse(userData))
        } else {
          reply.status(404).send('User data not found')
        }
      } catch (error) {
        console.log('Error fetching user data from Redis:', error)
        reply.status(500).send('Internal Server Error')
      }
    },
  })
}
