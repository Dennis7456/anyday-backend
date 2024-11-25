import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config()

const redisHost = process.env.REDISHOST
const redisToken = process.env.REDISPASSWORD

if (!redisHost) {
  console.error('Missing Redis URL')
  process.exit(1)
}

if (!redisToken) {
  console.error('Missing Redis Token')
  process.exit(1)
}

const redisClient = new Redis({
  url: redisHost,
  token: redisToken,
})

// Test Redis connection only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  ;(async () => {
    try {
      await redisClient.set('foo', 'bar')
      const data = await redisClient.get('foo')
      console.log('Redis connected successfully:', data)
    } catch (error) {
      console.error('Error interacting with Redis:', error)
      process.exit(1)
    }
  })()
}

export default redisClient
