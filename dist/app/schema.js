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
exports.schema = void 0;
const schema_1 = require("@graphql-tools/schema");
const schema_graphql_1 = __importDefault(require("./schema.graphql"));
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = require("./auth");
// type User = {
//   id: number;
//   firstName: string;
//   lastName: string;
//   userName: string;
//   email: string;
//   dateOfBirth: string;
//   password: string;
// };
const users = [
    {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe23',
        email: 'johndoe23@mail.com',
        dateOfBirth: '13-03-1987',
        password: 'password',
    },
    {
        id: 2,
        firstName: 'Jane',
        lastName: 'Doe',
        userName: 'janedoe23',
        email: 'janedoe23@mail.com',
        dateOfBirth: '10-05-1997',
        password: 'password',
    },
];
const resolvers = {
    Query: {
        users: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            return context.prisma.user.findMany();
        }),
        user: (parent, args, context) => {
            const user = context.prisma.user.findUnique({
                where: { id: args.id },
            });
            return user;
        },
        loggedInUser: (parent, args, context) => {
            if (context.currentUser === null) {
                throw new Error('Please login');
            }
            return context.currentUser;
        },
    },
    Mutation: {
        register: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            const password = yield (0, bcryptjs_1.hash)(args.password, 10);
            const user = yield context.prisma.user.create({
                data: {
                    firstName: args.firstName,
                    lastName: args.lastName,
                    userName: args.userName,
                    email: args.email,
                    dateOfBirth: args.dateOfBirth,
                    password: password,
                },
            });
            const token = (0, jsonwebtoken_1.sign)({ userId: user.id }, auth_1.APP_SECRET);
            return {
                token,
                user,
            };
        }),
        login: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield context.prisma.user.findUnique({
                where: { email: args.email },
            });
            if (!user) {
                throw new Error('User does not exist');
            }
            const validUser = yield (0, bcryptjs_1.compare)(args.password, user.password);
            if (!validUser) {
                throw new Error('Incorrect password');
            }
            const token = (0, jsonwebtoken_1.sign)({ userId: user.id }, auth_1.APP_SECRET);
            return {
                token,
                user,
            };
        }),
    },
    User: {
        id: (parent) => parent.id,
        firstName: (parent) => parent.firstName,
        lastName: (parent) => parent.lastName,
        userName: (parent) => parent.userName,
        email: (parent) => parent.email,
        dateOfBirth: (parent) => parent.dateOfBirth,
        password: (parent) => parent.password,
    },
};
exports.schema = (0, schema_1.makeExecutableSchema)({
    typeDefs: schema_graphql_1.default,
    resolvers,
});
