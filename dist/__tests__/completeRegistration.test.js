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
const userController_1 = require("../src/controllers/userController");
const redisClient_1 = __importDefault(require("../src/services/redisClient"));
// Mock the dependencies
jest.mock('../src/services/redisClient');
describe('completeRegistration', () => {
    const token = 'mocked-verification-token';
    const cachedData = {
        email: 'test@example.com',
        paperType: 'Essay',
        numberOfPages: 5,
        dueDate: new Date('2024-12-01').toISOString(),
    };
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should complete registration successfully and delete token from Redis', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock Redis get and del methods for success case
        redisClient_1.default.get.mockResolvedValue(JSON.stringify(cachedData));
        redisClient_1.default.del.mockResolvedValue(1); // Simulates successful deletion
        const result = yield userController_1.userResolvers.Mutation.completeRegistration(null, { token });
        expect(result.valid).toBe(true);
        expect(result.message).toBe('Registration completed successfully and order created.');
        // Verify Redis methods were called correctly
        expect(redisClient_1.default.get).toHaveBeenCalledWith(token);
        expect(redisClient_1.default.del).toHaveBeenCalledWith(token);
    }));
    it('should throw an error when the token is invalid or expired', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock Redis get to simulate a missing token
        redisClient_1.default.get.mockResolvedValue(null);
        yield expect(userController_1.userResolvers.Mutation.completeRegistration(null, { token }))
            .rejects.toThrow('Invalid or expired token');
        // Verify Redis get was called, and del was not called
        expect(redisClient_1.default.get).toHaveBeenCalledWith(token);
        expect(redisClient_1.default.del).not.toHaveBeenCalled();
    }));
});
