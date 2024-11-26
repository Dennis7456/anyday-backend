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
dotenv_1.default.config();
// Initialize Fastify application
exports.app = (0, fastify_1.default)({
    logger: true,
});
// CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://anydayessay.com',
    'https://anyday-essay-client.web.app',
    'http://localhost:3000',
    'https://anyday-backend-gcloudrun-969666510139.us-central1.run.app/graphql',
].filter(Boolean); // Remove undefined/null origins
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
exports.app.addHook('onRequest', (req, reply, done) => {
    console.log(`[${req.method}] ${req.url}`);
    if (req.body)
        console.log('Body:', req.body);
    if (req.headers)
        console.log('Headers:', req.headers);
    done();
});
// Centralized Route Registration
const routes = [
    { handler: indexRoute_1.registerIndexRoute, name: 'Index' },
    { handler: graphqlRoute_1.registerGraphQLRoute, name: 'GraphQL' },
    { handler: (app) => (0, getRedisDataRoute_1.registerGetRedisDataRoute)(app, redisClient_1.default), name: 'Get Redis Data' },
    { handler: uploadFilesRoute_1.registerUploadFilesRoute, name: 'Upload Files' },
    { handler: showFileRoute_1.registerListFilesRoute, name: 'List Files' },
    { handler: createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute, name: 'Create Stripe Payment Session' },
    { handler: (app) => (0, stripeWebHookHandlerRoute_1.registerStripeWebHookHandlerRoute)(app, apolloClient_1.apolloClient), name: 'Stripe WebHook Handler' },
    { handler: verifyEmailRoute_1.registerVerifyEmailRoute, name: 'Verify Email' },
];
const registerRoutes = () => {
    routes.forEach(({ handler, name }) => {
        try {
            handler(exports.app);
            console.log(`Registered ${name} route`);
        }
        catch (err) {
            console.error(`Error registering ${name} route:`, err);
        }
    });
};
// Start the server
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Register all routes
        registerRoutes();
        // Bind server to 0.0.0.0 to allow external access in Cloud Run
        const address = yield exports.app.listen({ port: 8080, host: '0.0.0.0' });
        if (typeof address !== 'string') {
            const addr = address;
            console.log(`Server listening on port ${addr.port}`);
        }
        else {
            console.log(`Server listening at ${address}`);
        }
    }
    catch (err) {
        exports.app.log.error(err);
        process.exit(1);
    }
});
// Run the server
start();
