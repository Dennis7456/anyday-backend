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
exports.createServer = createServer;
require("graphql-import-node");
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
// import {
//   getGraphQLParameters,
//   processRequest,
//   Request,
//   sendResult,
//   shouldRenderGraphiQL,
//   renderGraphiQL,
// } from 'graphql-helix'
const multipart_1 = __importDefault(require("@fastify/multipart"));
// import { schema } from './schema'
// import { contextFactory } from './context/context'
const indexRoute_1 = require("./routes/indexRoute");
const graphqlRoute_1 = require("./routes/graphqlRoute");
const getRedisDataRoute_1 = require("./routes/getRedisDataRoute");
const uploadFilesRoute_1 = require("./routes/uploadFilesRoute");
dotenv_1.default.config();
function createServer() {
    const server = (0, fastify_1.default)();
    server.register(multipart_1.default);
    // Registered routes
    (0, indexRoute_1.registerIndexRoute)(server);
    (0, graphqlRoute_1.registerGraphQLRoute)(server);
    (0, getRedisDataRoute_1.registerGetRedisDataRoute)(server);
    (0, uploadFilesRoute_1.registerUploadFilesRoute)(server);
    return server;
}
if (require.main === module) {
    ;
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const server = createServer();
            yield server.listen({ port: 4000, host: '0.0.0.0' });
            console.log(`Server is running on http://localhost:4000/`);
        }
        catch (error) {
            console.error(error);
            process.exit(1);
        }
    }))();
}
