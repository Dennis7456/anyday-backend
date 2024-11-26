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
// import fastifyCors from '@fastify/cors' // Import Fastify CORS plugin
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
dotenv_1.default.config();
// Initialize Fastify application
exports.app = (0, fastify_1.default)({
    logger: true,
});
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
exports.app.register(cors_1.default, {
    origin: (origin, cb) => {
        console.log('Incoming Origin:', origin);
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'https://anydayessay.com',
            'https://anyday-essay-client.web.app',
            'http://localhost:3000',
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
        }
        else {
            cb(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
});
// Function to register routes with error handling
const registerRoutes = () => {
    try {
        (0, indexRoute_1.registerIndexRoute)(exports.app);
        console.log('Registered index route');
    }
    catch (err) {
        console.error('Error registering index route:', err);
    }
    try {
        (0, graphqlRoute_1.registerGraphQLRoute)(exports.app);
        console.log('Registered GraphQL route');
    }
    catch (err) {
        console.error('Error registering GraphQL route:', err);
    }
    try {
        (0, getRedisDataRoute_1.registerGetRedisDataRoute)(exports.app, redisClient_1.default);
        console.log('Registered Get Redis Data route');
    }
    catch (err) {
        console.error('Error registering Get Redis Data route:', err);
    }
    try {
        (0, uploadFilesRoute_1.registerUploadFilesRoute)(exports.app);
        console.log('Registered Upload Files route');
    }
    catch (err) {
        console.error('Error registering Upload Files route:', err);
    }
    try {
        (0, showFileRoute_1.registerListFilesRoute)(exports.app);
        console.log('Registered List Files route');
    }
    catch (err) {
        console.error('Error registering List Files route:', err);
    }
    try {
        (0, createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute)(exports.app);
        console.log('Registered Create Stripe Payment Session route');
    }
    catch (err) {
        console.error('Error registering Create Stripe Payment Session route:', err);
    }
    try {
        (0, stripeWebHookHandlerRoute_1.registerStripeWebHookHandlerRoute)(exports.app, apolloClient_1.apolloClient);
        console.log('Registered Stripe WebHook Handler route');
    }
    catch (err) {
        console.error('Error registering Stripe WebHook Handler route:', err);
    }
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
            console.log(`Server listening on ${addr.port}`);
        }
    }
    catch (err) {
        exports.app.log.error(err);
        process.exit(1);
    }
});
// Run the server
start();
