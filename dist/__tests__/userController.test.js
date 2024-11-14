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
const sendVerificationEmail_1 = require("../src/services/sendVerificationEmail");
// Mock the dependencies
jest.mock('../src/services/redisClient', () => {
    return {
        setEx: jest.fn(),
        get: jest.fn(),
    };
});
jest.mock('../src/services/sendVerificationEmail');
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-verification-token'),
}));
// Import the redisClient mock after defining it to avoid the error
const redisClient_1 = __importDefault(require("../src/services/redisClient"));
describe('registerAndCreateOrder', () => {
    const input = {
        email: 'test@example.com',
        paperType: 'Essay',
        numberOfPages: 5,
        dueDate: new Date('2024-12-01'),
    };
    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });
    it('should successfully send a verification email and store data in Redis', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock Redis and email function success
        redisClient_1.default.setEx.mockResolvedValue(true);
        sendVerificationEmail_1.sendVerificationEmail.mockResolvedValue(true);
        const result = yield userController_1.userResolvers.Mutation.registerAndCreateOrder(null, { input });
        expect(result.success).toBe(true);
        expect(result.message).toBe('Verification Email Sent.');
        expect(result.verificationToken).toBe('mocked-verification-token');
        // Verify Redis and email were called correctly
        expect(redisClient_1.default.setEx).toHaveBeenCalledWith('mocked-verification-token', 3600, JSON.stringify({
            email: input.email,
            paperType: input.paperType,
            numberOfPages: input.numberOfPages,
            dueDate: input.dueDate,
        }));
        expect(sendVerificationEmail_1.sendVerificationEmail).toHaveBeenCalledWith(input.email, 'mocked-verification-token');
    }));
    it('should handle errors and return a failure response', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock Redis to simulate an error
        redisClient_1.default.setEx.mockRejectedValue(new Error('Redis error'));
        const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });
        const result = yield userController_1.userResolvers.Mutation.registerAndCreateOrder(null, { input });
        expect(result.success).toBe(false);
        expect(result.message).toBe('An error occurred while processing your request. Please try again later.');
        expect(result.verificationToken).toBeNull();
        // Ensure that Redis was called and the error was handled
        expect(redisClient_1.default.setEx).toHaveBeenCalled();
        expect(sendVerificationEmail_1.sendVerificationEmail).not.toHaveBeenCalled();
        consoleErrorMock.mockRestore();
    }));
});
