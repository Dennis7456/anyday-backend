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
exports.userResolvers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_2 = require("bcryptjs");
const config_1 = require("../config/config");
const uuid_1 = require("uuid");
const sendVerificationEmail_1 = require("../services/sendVerificationEmail");
const redisClient_1 = __importDefault(require("../services/redisClient"));
const client_1 = require("@prisma/client");
exports.userResolvers = {
    Query: {
        users: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            return context.prisma.user.findMany();
        }),
        user: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            return context.prisma.user.findUnique({ where: { id } });
        }),
        loggedInUser: (_, __, context) => {
            if (!context.currentUser) {
                throw new Error('Please login');
            }
            return context.currentUser;
        },
    },
    Mutation: {
        registerAndCreateOrder: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { input }) {
            try {
                const verificationToken = (0, uuid_1.v4)();
                // Store registration data in Redis with an expiration time
                yield redisClient_1.default.set(verificationToken, JSON.stringify({
                    email: input.email,
                    paperType: input.paperType,
                    numberOfPages: input.numberOfPages,
                    dueDate: input.dueDate,
                }), { ex: config_1.REGISTER_EXPIRATION });
                yield (0, sendVerificationEmail_1.sendVerificationEmail)(input.email, verificationToken);
                return {
                    success: true,
                    message: 'Verification Email Sent.',
                    verificationToken,
                };
            }
            catch (error) {
                console.error('Error in registerAndCreateOrder:', error);
                return {
                    success: false,
                    message: 'An error occurred while processing your request. Please try again later.',
                    verificationToken: null,
                };
            }
        }),
        login: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input }, context) {
            const { email, password } = input;
            const user = yield context.prisma.user.findUnique({ where: { email } });
            if (!user) {
                throw new Error('User does not exist');
            }
            const isValidPassword = yield bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.APP_SECRET);
            return {
                token,
                user,
            };
        }),
        verifyEmail: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { token }) {
            const cachedData = yield redisClient_1.default.get(token);
            if (!cachedData) {
                return {
                    valid: false,
                    message: 'Invalid or expired token.',
                    redirectUrl: '#',
                    token: '',
                };
            }
            // Data is valid, proceed to verification
            return {
                valid: true,
                message: 'Email verified. Please complete your registration.',
                redirectUrl: `${config_1.baseUrl}/complete-registration`,
                token: token,
            };
        }),
        completeRegistration: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { token }, { redisClient }) {
            try {
                const cachedData = yield redisClient.get(token);
                if (!cachedData) {
                    return {
                        valid: false,
                        message: 'Invalid or expired token.',
                    };
                }
                const { email, paperType, numberOfPages, dueDate } = JSON.parse(cachedData);
                console.log('Verified data:', {
                    email,
                    paperType,
                    numberOfPages,
                    dueDate,
                });
                // Delete token after successful verification
                yield redisClient.del(token);
                return {
                    valid: true,
                    message: 'Registration completed successfully and order created.',
                };
            }
            catch (error) {
                console.error('Error in completeRegistration:', error);
                throw new Error('An error occurred while completing registration.');
            }
        }),
        createStudent: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input }, context) {
            const { firstName, lastName, email, phoneNumber, dateOfBirth, password } = input;
            // Ensure input validation includes password requirements
            if (!firstName ||
                !lastName ||
                !email ||
                !phoneNumber ||
                !dateOfBirth ||
                !password) {
                throw new Error('All fields are required.');
            }
            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters long.');
            }
            const userName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.floor(Math.random() * 10000)}`;
            try {
                const hashedPassword = yield (0, bcryptjs_2.hash)(password, 10);
                // Ensure dateOfBirth is a valid Date object
                const formattedDateOfBirth = new Date(dateOfBirth);
                if (isNaN(formattedDateOfBirth.getTime())) {
                    throw new Error('Invalid date format for dateOfBirth');
                }
                const student = yield context.prisma.user.create({
                    data: {
                        firstName,
                        lastName,
                        userName,
                        email,
                        phoneNumber,
                        dateOfBirth: formattedDateOfBirth,
                        password: hashedPassword,
                        role: 'STUDENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return student;
            }
            catch (error) {
                console.error('Error creating student:', error);
                throw new Error('An error occurred while creating the student.');
            }
        }),
        updateUser: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id, input }, context) {
            try {
                // Validate the role input
                if (input.role && !Object.values(client_1.Role).includes(input.role)) {
                    throw new Error('Invalid role value');
                }
                const updatedUser = yield context.prisma.user.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, input), { role: input.role }),
                });
                return updatedUser;
            }
            catch (error) {
                console.error('Error updating user:', error);
                throw new Error('An error occurred while updating the user.');
            }
        }),
        deleteUser: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            try {
                yield context.prisma.user.delete({ where: { id } });
                return { message: 'User deleted successfully' };
            }
            catch (error) {
                console.error('Error deleting user:', error);
                throw new Error('An error occurred while deleting the user.');
            }
        }),
    },
    User: {
        orders: (parent, _, context) => {
            const orders = context.prisma.order.findMany({
                where: { studentId: parent.id },
            });
            return orders || [];
        },
        notifications: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const notifications = yield context.prisma.notification.findMany({
                where: { recipientId: parent.id },
            });
            return notifications || [];
        }),
        sentMessages: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const notifications = yield context.prisma.message.findMany({
                where: { senderId: parent.id },
            });
            return notifications || [];
        }),
        // Resolver for receivedMessages
        receivedMessages: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const messages = yield context.prisma.message.findMany({
                where: { recipientId: parent.id }, // Filter messages where the user is the recipient
            });
            return messages || [];
        }),
        // Resolver for qaReviews
        qaReviews: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const reviews = yield context.prisma.review.findMany({
                where: { qaId: parent.id }, // Filter reviews where the user is the QA
            });
            return reviews || [];
        }),
        // Resolver for writtenReviews
        writtenReviews: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const reviews = yield context.prisma.review.findMany({
                where: { writerId: parent.id }, // Filter reviews where the user is the writer
            });
            return reviews || [];
        }),
        // Resolver for assignments
        assignments: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const assignments = yield context.prisma.assignment.findMany({
                where: { writerId: parent.id }, // Filter assignments where the user is the writer
            });
            return assignments || [];
        }),
        // Resolver for chats
        chats: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            const chats = yield context.prisma.chat.findMany({
                where: {
                    participants: {
                        some: { id: parent.id }, // Filter chats where the user is a participant
                    },
                },
            });
            return chats || [];
        }),
    },
};
