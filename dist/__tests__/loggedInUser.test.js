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
describe('loggedInUser resolver', () => {
    let context;
    beforeEach(() => {
        jest.clearAllMocks(); // Clear any mocks before each test
    });
    it('should return the currentUser when logged in', () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock a logged-in user in the context
        const mockUser = {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phoneNumber: '1234567890',
            dateOfBirth: new Date('2000-01-01'),
            role: 'STUDENT',
        };
        context = {
            currentUser: mockUser, // Set the mock user in context
        };
        // Call the resolver directly
        const result = yield userController_1.userResolvers.Query.loggedInUser(null, {}, context);
        // Assert that the result matches the mock user
        expect(result).toEqual(mockUser);
    }));
    it('should throw an error when currentUser is not set', () => __awaiter(void 0, void 0, void 0, function* () {
        // Set currentUser to null in the context to simulate a not logged-in user
        context = {
            currentUser: null, // No user in context
        };
        try {
            userController_1.userResolvers.Query.loggedInUser(null, {}, context);
        }
        catch (error) {
            // console.error(error);
            expect(error).toEqual(new Error('Please login'));
        }
    }));
});
