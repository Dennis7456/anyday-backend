"use strict";
// src/services/redisClient.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisHost = process.env.REDISHOST;
const redisPort = parseInt(process.env.REDISPORT || '6379', 10);
const redisPassword = process.env.REDISPASSWORD;
if (!redisHost || !redisPort) {
    throw new Error('REDISHOST or REDISPORT environment variables are not set');
}
exports.redisClient = (0, redis_1.createClient)({
    url: `redis://${redisHost}:${redisPort}`,
    password: redisPassword,
});
exports.redisClient.on('error', (err) => console.error('Redis Client Error', err));
const connectRedis = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.redisClient.connect();
        console.log('Redis Client connected successfully');
    }
    catch (error) {
        console.error('Error connecting to Redis:', error);
        process.exit(1);
    }
});
// Only connect if not in a test environment
if (process.env.NODE_ENV !== 'test') {
    connectRedis();
}
