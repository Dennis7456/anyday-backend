"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redisHost = process.env.REDISHOST;
const redisPort = process.env.REDISPORT;
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
