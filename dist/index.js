"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("graphql-import-node");
const fastify_1 = __importDefault(require("fastify"));
// import cookiePlugin from 'fastify-cookie';
const cors_1 = __importDefault(require("@fastify/cors"));
const graphql_helix_1 = require("graphql-helix");
const graphql_1 = require("graphql");
const schema_1 = require("./schema");
const context_1 = require("./context");
const redisClient_1 = __importDefault(require("./redisClient"));
async function app() {
    const server = (0, fastify_1.default)({ logger: true });
    //Register fastify-cookie plugin
    // server.register(cookiePlugin as any);
    // CORS Configuration
    server.register(cors_1.default, {
        origin: [process.env.BASE_URL || 'https://anyday-frontend.web.app'],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        strictPreflight: true,
    });
    const port = Number(process.env.PORT) || 8080;
    // Handle preflight requests
    // server.options('*', (req, reply) => {
    //   reply.status(204).send();
    // });
    // GraphQL Endpoint
    server.route({
        method: ['POST', 'GET'],
        url: '/graphql',
        handler: async (req, resp) => {
            const request = {
                headers: req.headers,
                method: req.method,
                query: req.query,
                body: req.body,
            };
            resp.header('Access-Control-Allow-Origin', process.env.BASE_URL || 'https://anyday-frontend.web.app');
            if ((0, graphql_helix_1.shouldRenderGraphiQL)(request)) {
                resp.header('Content-Type', 'text/html');
                resp.send((0, graphql_helix_1.renderGraphiQL)({
                    endpoint: '/graphql',
                }));
                return;
            }
            const { operationName, query, variables } = (0, graphql_helix_1.getGraphQLParameters)(request);
            const result = await (0, graphql_helix_1.processRequest)({
                request,
                schema: schema_1.schema,
                operationName,
                contextFactory: () => (0, context_1.contextFactory)(req),
                query,
                variables,
            });
            if (result.type === "RESPONSE") {
                result.headers.forEach(({ name, value }) => {
                    resp.header(name, value);
                });
                resp.status(result.status);
                resp.serialize(result.payload);
                resp.send(result.payload);
            }
            else {
                (0, graphql_helix_1.sendResult)(result, resp.raw);
            }
        },
    });
    // Server Status Endpoint
    server.route({
        method: ['POST', 'GET'],
        url: '/',
        handler: async (req, resp) => {
            try {
                resp.status(200).send("Server is running!");
            }
            catch (error) {
                console.error("Error:", error);
                resp.status(500).send("Internal Server Error");
            }
        },
    });
    // Email Verification Endpoint
    server.route({
        method: 'GET',
        url: '/verify-email',
        handler: async (req, reply) => {
            // Type assertion
            const query = req.query;
            const token = query.token;
            if (!token) {
                reply.status(400).send('Token is required');
                return;
            }
            try {
                // Execute GraphQL mutation directly
                const result = await (0, graphql_1.graphql)({
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
                    contextValue: await (0, context_1.contextFactory)(req),
                });
                if (result.errors) {
                    console.error("GraphQL Errors:", result.errors);
                    reply.status(400).send('Verification failed');
                    return;
                }
                // Safe type assertion and handling
                const data = result.data;
                if (data && typeof data === 'object' && 'verifyEmail' in data) {
                    const { valid, message, redirectUrl, token } = data.verifyEmail;
                    if (valid) {
                        // Return a JSON response with the redirect URL
                        // resp.status(200).send({ redirectUrl });
                        // reply.header('Set-Cookie', `token=${token}; Path=/; HttpOnly`);
                        reply.header('Set-Cookie', `token=${token}; Path=/;`);
                        reply.redirect(redirectUrl || '/');
                    }
                    else {
                        reply.status(400).send(message || 'Verification failed');
                    }
                }
                else {
                    reply.status(400).send('Invalid response structure');
                }
            }
            catch (error) {
                console.error("Verification Error:", error);
                reply.status(500).send('Internal Server Error');
            }
        },
    });
    //Retrieve information from redis
    server.route({
        method: 'POST',
        url: '/api/redis/user-data',
        handler: async (req, reply) => {
            var _a;
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            console.log(req.headers);
            if (!token) {
                reply.status(401).send('Token is required');
                return;
            }
            try {
                const userData = await redisClient_1.default.get(token);
                if (userData) {
                    reply.send(JSON.parse(userData));
                }
                else {
                    reply.status(404).send('User data not found');
                }
            }
            catch (error) {
                console.log('Error fetching user data from Redis:', error);
                reply.status(500).send('Internal Server Error');
            }
        }
    });
    //Server listening
    server.listen({ port: port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address} on port ${port}`);
    });
}
app();
