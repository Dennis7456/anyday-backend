"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_SECRET = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
exports.APP_SECRET = 'secret';
async function authenticateUser(prisma, request) {
    const authHeader = request.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const tokenPayload = (0, jsonwebtoken_1.verify)(token, exports.APP_SECRET);
            if (tokenPayload && tokenPayload.userId) {
                return await prisma.user.findUnique({
                    where: {
                        id: tokenPayload.userId.toString(),
                    }
                });
            }
        }
        catch (error) {
            console.error("Error verifying token", error);
            return null;
        }
    }
    return null;
}
exports.default = authenticateUser;
