"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redisHost = process.env.REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10); // Ensure it's a number
if (!redisHost || !redisPort) {
    throw new Error("REDISHOST or REDISPORT environment variables are not set");
}
const redisClient = (0, redis_1.createClient)({
    url: `redis://${redisHost}:${redisPort}`
});
redisClient.on("error", (err) => console.error("Redis Client Error", err));
(async () => {
    try {
        await redisClient.connect();
        console.log("Redis Client connected successfully");
    }
    catch (error) {
        console.error("Error connecting to Redis:", error);
        process.exit(1); // Exit process on failure if necessary
    }
})();
exports.default = redisClient;
