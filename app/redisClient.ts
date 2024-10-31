import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDISHOST;
const redisPort = parseInt(process.env.REDISPORT || '6379', 10); // Ensure it's a number

if (!redisHost || !redisPort) {
    throw new Error("REDISHOST or REDISPORT environment variables are not set");
}

const redisClient: RedisClientType = createClient({
    url: `redis://${redisHost}:${redisPort}`
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
    try {
        await redisClient.connect();
        console.log("Redis Client connected successfully");
    } catch (error) {
        console.error("Error connecting to Redis:", error);
        process.exit(1); // Exit process on failure if necessary
    }
})();

export default redisClient;