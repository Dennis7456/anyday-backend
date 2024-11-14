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
                // Generate a unique verification token
                const verificationToken = (0, uuid_1.v4)();
                // Store the registration data in Redis temporarily with an expiration time
                yield redisClient_1.default.setEx(verificationToken, config_1.REGISTER_EXPIRATION, JSON.stringify({
                    email: input.email, // Corrected typo 'emai' to 'email'
                    paperType: input.paperType,
                    numberOfPages: input.numberOfPages,
                    dueDate: input.dueDate,
                }));
                // Send verification email
                yield (0, sendVerificationEmail_1.sendVerificationEmail)(input.email, verificationToken);
                // Return a success response with the verification token
                return {
                    success: true,
                    message: 'Verification Email Sent.',
                    verificationToken,
                };
            }
            catch (error) {
                // Handle any errors that occur during the process
                console.error('Error registering and creating order:', error);
                return {
                    success: false,
                    message: 'An error occurred while processing your request. Please try again later.',
                    verificationToken: null,
                };
            }
        }),
        login: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { email, password }, context) {
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
        completeRegistration: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { token }) {
            const cachedData = yield redisClient_1.default.get(token);
            if (!cachedData) {
                throw new Error('Invalid or expired token');
            }
            // const { email, paperType, numberOfPages, dueDate } =
            //   JSON.parse(cachedData)
            yield redisClient_1.default.del(token);
            return {
                valid: true,
                message: 'Registration completed successfully and order created.',
            };
        }),
        createStudent: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input }, context) {
            const { firstName, lastName, email, phoneNumber, dateOfBirth, password } = input;
            // Validate input fields
            if (!firstName ||
                !lastName ||
                !email ||
                !phoneNumber ||
                !dateOfBirth ||
                !password) {
                throw new Error('All fields are required.');
            }
            const userName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.floor(Math.random() * 10000)}`;
            const hashedPassword = yield (0, bcryptjs_2.hash)(password, 10);
            try {
                const student = yield context.prisma.user.create({
                    data: {
                        firstName,
                        lastName,
                        userName,
                        email,
                        phoneNumber,
                        dateOfBirth,
                        password: hashedPassword,
                        role: 'STUDENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return student;
            }
            catch (error) {
                console.error('Database error:', error);
                throw new Error('An error occurred while creating the student.');
            }
        }),
    },
    User: {
        orders: (parent, _, context) => {
            return context.prisma.order.findMany({ where: { studentId: parent.id } });
        },
    },
};
