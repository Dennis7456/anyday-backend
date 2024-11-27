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
exports.registerVerifyEmailRoute = registerVerifyEmailRoute;
const graphql_1 = require("graphql");
const schema_1 = require("../schema");
const context_1 = require("../context");
function registerVerifyEmailRoute(server) {
    // Server Status Endpoint
    server.route({
        method: 'GET',
        url: '/verify-email',
        handler: (req, resp) => __awaiter(this, void 0, void 0, function* () {
            const query = req.query;
            const token = query.token;
            if (!token) {
                resp.status(400).send({ error: 'Token is required' });
                return;
            }
            try {
                const result = yield (0, graphql_1.graphql)({
                    schema: schema_1.schema,
                    source: `
            mutation verifyEmail($token: String!) {
              verifyEmail(token: $token) {
                valid
                message
                redirectUrl
                token
              }
            }
          `,
                    variableValues: { token },
                    contextValue: yield (0, context_1.contextFactory)(req),
                });
                if (result.errors) {
                    console.error('GraphQL Errors:', result.errors);
                    resp.status(400).send({ error: 'Verification failed' });
                    return;
                }
                const data = result.data;
                if (data === null || data === void 0 ? void 0 : data.verifyEmail) {
                    const { valid, message, redirectUrl, token } = data.verifyEmail;
                    if (valid) {
                        resp.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure;`);
                        resp.redirect(redirectUrl || '/');
                    }
                    else {
                        resp.status(400).send({ error: message || 'Verification failed' });
                    }
                }
                else {
                    resp.status(400).send({ error: 'Invalid response structure' });
                }
            }
            catch (error) {
                console.error('Verification Error:', error);
                resp.status(500).send({ error: 'Internal Server Error' });
            }
        }),
    });
}
