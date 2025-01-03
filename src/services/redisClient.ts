import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config()

const redisUrl = process.env.REDIS_URL
const redisToken = process.env.REDIS_TOKEN

if (!redisUrl) {
  console.error('Missing Redis URL')
  process.exit(1)
}

if (!redisToken) {
  console.error('Missing Redis Token')
  process.exit(1)
}

const redisClient = new Redis({
  url: redisUrl,
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
