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
exports.registerGetRedisDataRoute = registerGetRedisDataRoute;
// import redisClient from '../services/redisClient'
function registerGetRedisDataRoute(server, redis) {
    server.route({
        method: 'POST',
        url: '/api/redis/user-data',
        handler: (req, reply) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            // console.log(req.headers)
            if (!token) {
                reply.status(401).send('Token is required');
                return;
            }
            try {
                const userData = yield redis.get(token);
                if (userData) {
                    reply.send(userData);
                }
                else {
                    reply.status(404).send('User data not found');
                }
            }
            catch (error) {
                console.log('Error fetching user data from Redis:', error);
                reply.status(500).send('Internal Server Error');
            }
        }),
    });
}
