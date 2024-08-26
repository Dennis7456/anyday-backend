"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_SECRET = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.APP_SECRET = 'secret';
async function authenticateUser(prisma, request) {
    if (request.headers.authorization) {
        const token = request.headers.authorization.split(' ')[1];
        // const tokenPayload = verify(token, APP_SECRET) as JwtPayload;
        const tokenPayload = jsonwebtoken_1.default.verify(token, exports.APP_SECRET);
        const userId = tokenPayload.userId;
        return await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
    }
    return null;
}
exports.default = authenticateUser;
