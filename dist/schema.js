"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const schema_1 = require("@graphql-tools/schema");
const schema_graphql_1 = __importDefault(require("./schema.graphql"));
const client_1 = require(".prisma/client");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = require("./auth");
const uuid_1 = require("uuid");
const redisClient_1 = __importDefault(require("./redisClient"));
// import { sendVerificationEmail } from './sendVerificationEmail';
const sendVerificationEmail_1 = require("./sendVerificationEmail");
const REGISTER_EXPIRATION = 3600; // 1 hour expiration
const baseUrl = process.env.BASE_URL || "https://anyday-frontend.web.app";
const users = [
    {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe23',
        email: 'johndoe23@mail.com',
        dateOfBirth: '1987-03-13',
        password: 'password',
        role: client_1.Role.STUDENT,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 2,
        firstName: 'Jane',
        lastName: 'Doe',
        userName: 'janedoe23',
        email: 'janedoe23@mail.com',
        dateOfBirth: '1997-05-10',
        password: 'password',
        role: client_1.Role.STUDENT,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];
const resolvers = {
    Query: {
        users: async (_, __, context) => {
            return context.prisma.user.findMany();
        },
        user: async (_, { id }, context) => {
            return context.prisma.user.findUnique({
                where: { id },
            });
        },
        loggedInUser: (_, __, context) => {
            if (!context.currentUser) {
                throw new Error('Please login');
            }
            return context.currentUser;
        },
        orders: async (_, __, context) => {
            if (!context.currentUser) {
                throw new Error('Authentication required');
            }
            return context.prisma.order.findMany();
        },
        order: async (_, { id }, context) => {
            if (!context.currentUser) {
                throw new Error('Authentication required');
            }
            return context.prisma.order.findUnique({
                where: { id },
            });
        },
    },
    Mutation: {
        registerAndCreateOrder: async (_, 
        // { email, paperType, pages, dueDate
        { input }) => {
            const verificationToken = (0, uuid_1.v4)();
            //store initial data in redis
            await redisClient_1.default.setEx(verificationToken, REGISTER_EXPIRATION, JSON.stringify({
                email: input.email,
                paperType: input.paperType,
                pages: input.pages,
                dueDate: input.dueDate
            }));
            await (0, sendVerificationEmail_1.sendVerificationEmail)(input.email, verificationToken);
            return { success: true, message: "Verification Email Sent.", verificationToken: verificationToken };
        },
        verifyEmail: async (_, { token }) => {
            const cachedData = await redisClient_1.default.get(token);
            if (!cachedData) {
                return { valid: false, message: 'Invalid or expired token.', redirectUrl: '#', token: '' };
            }
            // Data is valid, proceed to verification
            return { valid: true, message: 'Email verified. Please complete your registration.', redirectUrl: `${baseUrl}/complete-registration`, token: token };
        },
        completeRegistration: async (_, { token }) => {
            // Retrieve and parse cached data
            const cachedData = await redisClient_1.default.get(token);
            if (!cachedData) {
                throw new Error("Invalid or expired token");
            }
            // Parse cached data
            const { email, paperType, pages, dueDate } = JSON.parse(cachedData);
            // Complete user registration
            // const newUser = await createUser({ email });
            // Create a new order
            // const newOrder = await createOrder({
            //   userId: newUser.id,
            //   paperType,
            //   pages,
            //   dueDate
            // });
            // Optionally, delete the token from Redis after successful registration
            await redisClient_1.default.del(token);
            return {
                valid: true,
                message: "Registration complete and order created."
            };
        },
        register: async (_, { firstName, lastName, userName, email, dateOfBirth, password, role }, context) => {
            const hashedPassword = await (0, bcryptjs_1.hash)(password, 10);
            const user = await context.prisma.user.create({
                data: {
                    firstName,
                    lastName,
                    userName,
                    email,
                    dateOfBirth,
                    password: hashedPassword,
                    role,
                    createdAt: new Date(), // Ensure proper date format
                    updatedAt: new Date(), // Ensure proper date format
                },
            });
            const token = (0, jsonwebtoken_1.sign)({ userId: user.id }, auth_1.APP_SECRET);
            return {
                token,
                user,
            };
        },
        login: async (_, { email, password }, context) => {
            const user = await context.prisma.user.findUnique({
                where: { email },
            });
            if (!user) {
                throw new Error('User does not exist');
            }
            const isValid = await (0, bcryptjs_1.compare)(password, user.password);
            if (!isValid) {
                throw new Error('Incorrect password');
            }
            const token = (0, jsonwebtoken_1.sign)({ userId: user.id }, auth_1.APP_SECRET);
            return {
                token,
                user,
            };
        },
        createPayment: async (_, { orderId, amount, paymentStatus, transactionId }, context) => {
            if (!context.currentUser) {
                throw new Error('Authentication required');
            }
            return context.prisma.payment.create({
                data: {
                    orderId,
                    amount,
                    paymentStatus,
                    transactionId,
                },
            });
        },
        createReview: async (_, { orderId, qaId, writerId, comments, rating }, context) => {
            if (!context.currentUser) {
                throw new Error('Authentication required');
            }
            return context.prisma.review.create({
                data: {
                    orderId,
                    qaId,
                    writerId,
                    comments,
                    rating,
                },
            });
        },
        createAssignment: async (_, { orderId, writerId }, context) => {
            if (!context.currentUser) {
                throw new Error('Authentication required');
            }
            return context.prisma.assignment.create({
                data: {
                    orderId,
                    writerId,
                },
            });
        },
    },
    User: {
        orders: (parent, _, context) => {
            return context.prisma.order.findMany({
                where: { studentId: parent.id },
            });
        },
    },
    Order: {
        student: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.studentId },
            });
        },
    },
    Payment: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
    },
    Review: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
        qa: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.qaId },
            });
        },
        writer: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.writerId },
            });
        },
    },
    Assignment: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
        writer: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.writerId },
            });
        },
    },
};
exports.schema = (0, schema_1.makeExecutableSchema)({
    typeDefs: schema_graphql_1.default,
    resolvers,
});
