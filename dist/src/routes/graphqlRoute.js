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
exports.registerGraphQLRoute = registerGraphQLRoute;
const graphql_helix_1 = require("graphql-helix");
const schema_1 = require("../schema");
const context_1 = require("../context/context");
// Define and export the route as a function
function registerGraphQLRoute(server) {
    server.route({
        method: ['POST', 'GET', 'OPTIONS'],
        url: '/graphql',
        handler: (req, reply) => __awaiter(this, void 0, void 0, function* () {
            // Handle preflight OPTIONS request
            if (req.method === 'OPTIONS') {
                reply
                    .header('Access-Control-Allow-Origin', req.headers.origin || '*')
                    .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                    .status(204)
                    .send();
                return;
            }
            // Set CORS headers for other requests
            reply
                .header('Access-Control-Allow-Origin', req.headers.origin || '*')
                .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                .header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            const request = {
                headers: req.headers,
                method: req.method,
                query: req.query,
                body: req.body,
            };
            if ((0, graphql_helix_1.shouldRenderGraphiQL)(request)) {
                reply.header('Content-Type', 'text/html');
                reply.send((0, graphql_helix_1.renderGraphiQL)({
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
            if (result.type === 'RESPONSE') {
                result.headers.forEach(({ name, value }) => {
                    reply.header(name, value);
                });
                reply.status(result.status);
                reply.serialize(result.payload);
                reply.send(result.payload);
                // console.log(reply)
            }
            // sendResult(result, reply.raw)
            // console.log(result, reply.raw)
        }),
    });
}
