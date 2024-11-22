"use strict";
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
const redis_1 = require("@upstash/redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisHost = process.env.REDISHOST;
const redisPassword = process.env.REDISPASSWORD;
if (!redisHost || !redisPassword) {
    console.error('Missing Redis credentials');
    process.exit(1);
}
const setupRedis = () => __awaiter(void 0, void 0, void 0, function* () {
    const redis = new redis_1.Redis({
        url: redisHost,
        token: redisPassword,
    });
    try {
        // Attempt a basic Redis operation to verify the connection
        yield redis.set('foo', 'bar');
        const data = yield redis.get('foo');
        console.log('Redis connected successfully.', data);
    }
    catch (error) {
        console.error('Error interacting with Redis:', error);
        process.exit(1);
    }
    return redis;
});
// Call the async function
setupRedis();
