import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config()

const redisHost = process.env.REDISHOST
const redisPassword = process.env.REDISPASSWORD

if (!redisHost || !redisPassword) {
  console.error('Missing Redis credentials')
  process.exit(1)
}

const setupRedis = async () => {
  const redis = new Redis({
    url: redisHost,
    token: redisPassword,
  })

  try {
    // Attempt a basic Redis operation to verify the connection
    await redis.set('foo', 'bar')
    const data = await redis.get('foo')
    console.log('Redis connected successfully.', data)
  } catch (error) {
    console.error('Error interacting with Redis:', error)
    process.exit(1)
  }

  return redis
}

// Call the async function
setupRedis()
