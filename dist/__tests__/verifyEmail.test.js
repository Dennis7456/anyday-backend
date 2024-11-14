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
// Mock redisClient
jest.mock('../src/services/redisClient', () => ({
    get: jest.fn(),
}));
describe('verifyEmail', () => {
    const validToken = 'valid-token';
    const invalidToken = 'invalid-token';
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should return valid response for a valid token', () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedData = JSON.stringify({
            email: 'test@example.com',
            paperType: 'Essay',
            numberOfPages: 5,
            dueDate: new Date('2024-12-01'),
        });
        // Mock Redis to return cached data for the valid token
        redisClient_1.default.get.mockResolvedValue(cachedData);
        const result = yield userController_1.userResolvers.Mutation.verifyEmail(null, { token: validToken });
        expect(result.valid).toBe(true);
        expect(result.message).toBe('Email verified. Please complete your registration.');
        expect(result.redirectUrl).toBe(`${process.env.BASE_URL}/complete-registration`); // Ensure that the URL is correct
        expect(result.token).toBe(validToken);
        // Ensure Redis was called with the correct token
        expect(redisClient_1.default.get).toHaveBeenCalledWith(validToken);
    }));
    it('should return invalid response for an invalid or expired token', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock Redis to return null for the invalid token
        redisClient_1.default.get.mockResolvedValue(null);
        const result = yield userController_1.userResolvers.Mutation.verifyEmail(null, { token: invalidToken });
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Invalid or expired token.');
        expect(result.redirectUrl).toBe('#');
        expect(result.token).toBe('');
        // Ensure Redis was called with the correct token
        expect(redisClient_1.default.get).toHaveBeenCalledWith(invalidToken);
    }));
});
