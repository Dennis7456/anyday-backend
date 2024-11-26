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
exports.app = void 0;
require("graphql-import-node");
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("@fastify/cors"));
const formbody_1 = __importDefault(require("@fastify/formbody"));
// import FastifyMultipart from '@fastify/multipart';
const indexRoute_1 = require("./routes/indexRoute");
const graphqlRoute_1 = require("./routes/graphqlRoute");
const getRedisDataRoute_1 = require("./routes/getRedisDataRoute");
const uploadFilesRoute_1 = require("./routes/uploadFilesRoute");
const showFileRoute_1 = require("./routes/showFileRoute");
const createStripeSessionRoute_1 = require("./routes/createStripeSessionRoute");
const stripeWebHookHandlerRoute_1 = require("./routes/stripeWebHookHandlerRoute");
const apolloClient_1 = require("./routes/client/apolloClient");
const redisClient_1 = __importDefault(require("./services/redisClient"));
const verifyEmailRoute_1 = require("./routes/verifyEmailRoute");
// import fastifyMultipart from '@fastify/multipart';
dotenv_1.default.config();
// Initialize Fastify application
exports.app = (0, fastify_1.default)({
    logger: true,
});
// Normalize allowed origins
const allowedOrigins = [
    // process.env.FRONTEND_URL,
    'https://anydayessay.com',
    'https://anyday-essay-client.web.app',
    'http://localhost:3000',
    'https://anyday-backend-gcloudrun-969666510139.us-central1.run.app/graphql',
].filter(Boolean);
exports.app.register(cors_1.default, {
    origin: (origin, cb) => {
        console.log('Incoming Origin:', origin);
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
        }
        else {
            console.error('CORS Denied for:', origin);
            cb(new Error('CORS Error: Origin not allowed'), false);
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
});
exports.app.register(formbody_1.default);
if (!exports.app.hasDecorator('multipartErrors')) {
    // app.register(FastifyMultipart);
}
exports.app.addHook('onRequest', (req, reply, done) => {
    console.log(`[${req.method}] ${req.url}`);
    if (req.method === 'OPTIONS') {
        console.log('Preflight Request:', req.headers.origin);
    }
    if (req.body)
        console.log('Body:', req.body);
    if (req.headers)
        console.log('Headers:', req.headers);
    console.log('--- Incoming Request ---');
    console.log(`[${req.method}] ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query Params:', req.query);
    console.log('--- End of Request ---');
    done();
});
exports.app.setErrorHandler((error, request, reply) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        reply.header('Access-Control-Allow-Origin', origin);
    }
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Log the error for debugging
    exports.app.log.error(error);
    // Send the error response
    reply.status(500).send({ error: error.message });
});
// Route registration
const routes = [
    { handler: indexRoute_1.registerIndexRoute, name: 'Index' },
    { handler: graphqlRoute_1.registerGraphQLRoute, name: 'GraphQL' },
    {
        handler: (app) => (0, getRedisDataRoute_1.registerGetRedisDataRoute)(app, redisClient_1.default),
        name: 'Get Redis Data',
    },
    { handler: uploadFilesRoute_1.registerUploadFilesRoute, name: 'Upload Files' },
    { handler: showFileRoute_1.registerListFilesRoute, name: 'List Files' },
    {
        handler: createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute,
        name: 'Create Stripe Payment Session',
    },
    {
        handler: (app) => (0, stripeWebHookHandlerRoute_1.registerStripeWebHookHandlerRoute)(app, apolloClient_1.apolloClient),
        name: 'Stripe WebHook Handler',
    },
    { handler: verifyEmailRoute_1.registerVerifyEmailRoute, name: 'Verify Email' },
];
const registerRoutes = () => {
    routes.forEach(({ handler, name }) => {
        try {
            handler(exports.app);
            console.log(`Registered route: ${name}`);
        }
        catch (err) {
            console.error(`Error registering route ${name}:`, err);
        }
    });
};
// Start the server
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        registerRoutes();
        const address = yield exports.app.listen({ port: 8080, host: '0.0.0.0' });
        const portInfo = typeof address === 'string' ? address : address.port;
        console.log(`Server running at port ${portInfo}`);
    }
    catch (err) {
        exports.app.log.error(err);
        process.exit(1);
    }
});
start();
