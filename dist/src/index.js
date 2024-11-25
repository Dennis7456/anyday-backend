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
exports.app = (0, fastify_1.default)({
    logger: true,
});
// Registered routes
(0, indexRoute_1.registerIndexRoute)(exports.app);
(0, graphqlRoute_1.registerGraphQLRoute)(exports.app);
(0, getRedisDataRoute_1.registerGetRedisDataRoute)(exports.app, redisClient_1.default);
(0, uploadFilesRoute_1.registerUploadFilesRoute)(exports.app);
(0, showFileRoute_1.registerListFilesRoute)(exports.app);
(0, createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute)(exports.app);
(0, stripeWebHookHandlerRoute_1.registerStripeWebHookHandlerRoute)(exports.app, apolloClient_1.apolloClient);
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const address = yield exports.app.listen({ port: 8080 });
        if (typeof address !== 'string') {
            const addr = address;
            console.log(`server listening on ${addr.port}`);
        }
    }
    catch (err) {
        exports.app.log.error(err);
        process.exit(1);
    }
});
start();
