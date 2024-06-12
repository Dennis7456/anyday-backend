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
require("graphql-import-node");
const fastify_1 = __importDefault(require("fastify"));
const graphql_helix_1 = require("graphql-helix");
const schema_1 = require("./schema");
const context_1 = require("./context");
function app() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = (0, fastify_1.default)();
        const port = 3001;
        server.route({
            method: ['POST', 'GET'],
            url: '/graphql',
            handler: (req, resp) => __awaiter(this, void 0, void 0, function* () {
                const request = {
                    headers: req.headers,
                    method: req.method,
                    query: req.query,
                    body: req.body,
                };
                if ((0, graphql_helix_1.shouldRenderGraphiQL)(request)) {
                    resp.header('Content-Type', 'text/html');
                    resp.send((0, graphql_helix_1.renderGraphiQL)({
                        endpoint: '/graphql',
                    }));
                    return;
                }
                const { operationName, query, variables } = (0, graphql_helix_1.getGraphQLParameters)(request);
                const result = yield (0, graphql_helix_1.processRequest)({
                    request,
                    schema: schema_1.schema,
                    operationName,
                    contextFactory: () => (0, context_1.contextFactory)(req),
                    query,
                    variables,
                });
                (0, graphql_helix_1.sendResult)(result, resp.raw);
            }),
        });
        server.listen({ port: port }, (err, address) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log(`Server listening at ${address}`);
        });
    });
}
app();
