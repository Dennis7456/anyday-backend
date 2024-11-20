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
Object.defineProperty(exports, "__esModule", { value: true });
const userController_1 = require("../src/controllers/userController");
const bcryptjs_1 = require("bcryptjs");
// Mock the dependencies
jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
}));
// Define the mock for `prisma.user.create`
const mockPrismaCreate = jest.fn();
// Define a mock `currentUser`, set to null or an example user
const mockCurrentUser = null; // Or, if needed, an example user: { id: '123', userName: 'john_doe' }
const context = {
    prisma: {
        user: {
            create: mockPrismaCreate,
        },
    }, // Cast `prisma` as `PrismaClient` to satisfy TypeScript
    currentUser: mockCurrentUser, // Add `currentUser` to the context
};
describe('createStudent', () => {
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
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });
    it('should create a student successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        bcryptjs_1.hash.mockResolvedValue('hashedPassword');
        mockPrismaCreate.mockResolvedValue(Object.assign(Object.assign({}, input), { id: '1', userName: 'john_doe_1234', role: 'STUDENT', createdAt: new Date(), updatedAt: new Date() }));
        const result = yield userController_1.userResolvers.Mutation.createStudent(null, { input }, context);
        expect(bcryptjs_1.hash).toHaveBeenCalledWith(input.password, 10);
        expect(mockPrismaCreate).toHaveBeenCalledWith({
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                userName: expect.stringMatching(/^john_doe_\d+$/), // Ensure pattern matching
                email: input.email,
                phoneNumber: input.phoneNumber,
                dateOfBirth: input.dateOfBirth,
                password: 'hashedPassword',
                role: 'STUDENT',
                createdAt: expect.any(Date), // Allow for any date object
                updatedAt: expect.any(Date), // Allow for any date object
            },
        });
        expect(result).toEqual(expect.objectContaining({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
        }));
    }));
    it('should throw an error if required fields are missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const invalidInput = Object.assign(Object.assign({}, input), { firstName: '' });
        yield expect(userController_1.userResolvers.Mutation.createStudent(null, { input: invalidInput }, context)).rejects.toThrow('All fields are required.');
        expect(mockPrismaCreate).not.toHaveBeenCalled();
    }));
    it('should throw an error if there is a database error', () => __awaiter(void 0, void 0, void 0, function* () {
        bcryptjs_1.hash.mockResolvedValue('hashedPassword');
        // Reject the Prisma mock with a database error
        mockPrismaCreate.mockRejectedValue(new Error('Database error'));
        // Wrap the call in an async assertion to ensure it's caught
        yield expect(userController_1.userResolvers.Mutation.createStudent(null, { input }, context))
            .rejects
            .toThrow('An error occurred while creating the student.');
        // Ensure the mock was called
        expect(mockPrismaCreate).toHaveBeenCalled();
    }));
});
