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
const apollo_server_1 = require("apollo-server");
const userController_1 = require("../../src/controllers/userController");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockImplementation((payload, secret, options) => {
        // Ensure we are passing 'SASQUATCH' as the secret
        expect(secret).toBe('SASQUATCH');
        return 'mockedToken';
    }),
}));
const mockPrismaCreate = jest.fn();
const mockPrismaFindUnique = jest.fn();
const mockCurrentUser = null;
const context = {
    prisma: {
        user: {
            create: mockPrismaCreate,
            findUnique: mockPrismaFindUnique,
        },
    },
    currentUser: mockCurrentUser,
};
describe('Authentication', () => {
    const input = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password@123',
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        bcryptjs_1.hash.mockResolvedValue('hashedPassword');
        mockPrismaCreate.mockResolvedValue(Object.assign(Object.assign({}, input), { id: '1', userName: 'john_doe_1234', role: 'STUDENT', createdAt: new Date(), updatedAt: new Date() }));
        const result = yield userController_1.userResolvers.Mutation.createStudent(null, { input }, context);
        expect(bcryptjs_1.hash).toHaveBeenCalledWith(input.password, 10);
        expect(mockPrismaCreate).toHaveBeenCalledWith({
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                userName: expect.stringMatching(/^john_doe_\d+$/),
                email: input.email,
                phoneNumber: input.phoneNumber,
                dateOfBirth: input.dateOfBirth,
                password: 'hashedPassword',
                role: 'STUDENT',
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            },
        });
        expect(result).toEqual(expect.objectContaining({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
        }));
    }));
    it('logs in a user and returns a token', () => __awaiter(void 0, void 0, void 0, function* () {
        const loginInput = {
            email: 'john.doe@example.com',
            password: 'password@123',
        };
        mockPrismaFindUnique.mockResolvedValue(Object.assign(Object.assign({ id: '1' }, input), { password: 'hashedPassword' }));
        bcryptjs_1.compare.mockResolvedValue(true);
        jsonwebtoken_1.default.sign.mockReturnValue('mockedJwtToken');
        const loginMutation = (0, apollo_server_1.gql) `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
        }
      }
    `;
        const result = yield userController_1.userResolvers.Mutation.login(null, Object.assign({}, loginInput), context);
        expect(bcryptjs_1.compare).toHaveBeenCalledWith(loginInput.password, 'hashedPassword');
        // Ensure jwt.sign is called with the correct APP_SECRET (which is 'SASQUATCH' by default)
        expect(jsonwebtoken_1.default.sign).toHaveBeenCalledWith({ userId: '1' }, 'SASQUATCH');
        expect(result).toEqual({
            token: 'mockedJwtToken',
            user: {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phoneNumber: '1234567890',
                dateOfBirth: new Date('2000-01-01'),
                password: 'hashedPassword',
            }
        });
    }));
});
