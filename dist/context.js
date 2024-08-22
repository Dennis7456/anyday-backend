"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextFactory = void 0;
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./auth"));
const prisma = new client_1.PrismaClient();
async function contextFactory(request) {
    return {
        prisma,
        currentUser: await (0, auth_1.default)(prisma, request),
    };
}
exports.contextFactory = contextFactory;
