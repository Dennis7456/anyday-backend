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
exports.APP_SECRET = void 0;
exports.authenticateUser = authenticateUser;
const jsonwebtoken_1 = require("jsonwebtoken");
exports.APP_SECRET = 'SASQUATCH';
function authenticateUser(prisma, request) {
    return __awaiter(this, void 0, void 0, function* () {
        const authHeader = request.headers.authorization;
        console.log('Authorization Header:', authHeader);
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                console.log('Extracted Token:', token);
                const tokenPayload = (0, jsonwebtoken_1.verify)(token, exports.APP_SECRET);
                console.log('Decoded Token Payload:', tokenPayload);
                if (tokenPayload && tokenPayload.userId) {
                    const userId = tokenPayload.userId;
                    const user = yield prisma.user.findUnique({ where: { id: userId } });
                    console.log('Authenticated User:', user);
                    return user;
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Token verification failed:', error.message);
                }
            }
        }
        else {
            console.warn('No Authorization header provided.');
        }
        return null;
    });
}
