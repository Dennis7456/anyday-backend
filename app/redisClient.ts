import { createClient, RedisClientType } from 'redis';

const redisClient: RedisClientType = createClient({
    url: "redis://localhost:6379"
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
