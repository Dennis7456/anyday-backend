import { createClient, RedisClientType } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

const redisHost = process.env.REDISHOST
const redisPort = parseInt(process.env.REDISPORT || '6379', 10)

// Set password to undefined if in development mode
const redisPassword =
  process.env.NODE_ENV === 'development' ? undefined : process.env.REDISPASSWORD

if (!redisHost || !redisPort) {
  throw new Error('REDISHOST or REDISPORT environment variables are not set')
}

const redisClient: RedisClientType = createClient({
  url: `redis://${redisHost}:${redisPort}`,
  password: redisPassword,
})

redisClient.on('error', (err) => console.error('Redis Client Error', err))

const connectRedis = async () => {
  try {
    await redisClient.connect()
    console.log('Redis Client connected successfully')
  } catch (error) {
    console.error('Error connecting to Redis:', error)
    process.exit(1)
  }
}

// Only connect if not in a test environment
if (process.env.NODE_ENV !== 'test') {
  connectRedis()
}

export default redisClient
