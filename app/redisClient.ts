import { createClient, RedisClientType } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

const redisHost = process.env.REDISHOST
const redisPort = parseInt(process.env.REDISPORT || '6379', 10)
const redisPassword = process.env.REDISPASSWORD

if (!redisHost || !redisPort || !redisPassword) {
  throw new Error(
    'REDISHOST, REDISPORT, or REDISPASSWORD environment variables are not set'
  )
}

const redisClient: RedisClientType = createClient({
  url: `redis://${redisHost}:${redisPort}`,
  password: redisPassword,
})

redisClient.on('error', (err) => console.error('Redis Client Error', err))
;(async () => {
  try {
    await redisClient.connect()
    console.log('Redis Client connected successfully')
  } catch (error) {
    console.error('Error connecting to Redis:', error)
    process.exit(1)
  }
})()

export default redisClient
