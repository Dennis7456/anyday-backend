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
const fastify_1 = __importDefault(require("fastify"));
const getRedisDataRoute_1 = require("../src/routes/getRedisDataRoute");
const redisClient_1 = __importDefault(require("../src/services/redisClient"));
jest.mock('../src/services/redisClient'); // Mock the redisClient module
describe('GET Redis Data Route', () => {
    let server;
    // Mock console.log to suppress output during tests
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { }); // Suppress console.log
    });
    afterAll(() => {
        jest.restoreAllMocks(); // Restore console.log after tests
    });
    beforeEach(() => {
        // Create a new Fastify instance for each test
        server = (0, fastify_1.default)();
        // Register the route
        (0, getRedisDataRoute_1.registerGetRedisDataRoute)(server);
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        // Close the server after each test
        yield server.close();
    }));
    it('should return 401 if token is not provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield server.inject({
            method: 'POST',
            url: '/api/redis/user-data',
            headers: {
                Authorization: '',
            },
        });
        expect(response.statusCode).toBe(401); // Expect Unauthorized status code
        expect(response.body).toBe('Token is required'); // Expect token error message
    }));
    it('should return 404 if user data is not found in Redis', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockToken = 'valid-token';
        // Mock Redis client to return null when fetching the user data
        redisClient_1.default.get.mockResolvedValue(null);
        const response = yield server.inject({
            method: 'POST',
            url: '/api/redis/user-data',
            headers: {
                Authorization: `Bearer ${mockToken}`,
            },
        });
        expect(response.statusCode).toBe(404); // Expect Not Found status code
        expect(response.body).toBe('User data not found'); // Expect user data not found message
    }));
    it('should return 200 and user data if found in Redis', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockToken = 'valid-token';
        const mockUserData = {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
        };
        // Mock Redis client to return the mock user data when fetching with the token
        redisClient_1.default.get.mockResolvedValueOnce(JSON.stringify(mockUserData));
        const response = yield server.inject({
            method: 'POST',
            url: '/api/redis/user-data',
            headers: {
                Authorization: `Bearer ${mockToken}`,
            },
        });
        expect(response.statusCode).toBe(200); // Expect OK status code
        expect(JSON.parse(response.body)).toEqual(mockUserData); // Expect the user data returned to match mock
    }));
    it('should return 500 if an error occurs during Redis interaction', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockToken = 'valid-token';
        // Mock Redis client to throw an error when attempting to get user data
        redisClient_1.default.get.mockRejectedValue(new Error('Redis error'));
        const response = yield server.inject({
            method: 'POST',
            url: '/api/redis/user-data',
            headers: {
                Authorization: `Bearer ${mockToken}`,
            },
        });
        expect(response.statusCode).toBe(500); // Expect Internal Server Error status code
        expect(response.body).toBe('Internal Server Error'); // Expect general error message
    }));
});
