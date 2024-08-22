"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("graphql-import-node");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const graphql_helix_1 = require("graphql-helix");
const schema_1 = require("./schema");
const context_1 = require("./context");
// import { SpeedInsights } from "@vercel/speed-insights/next"
async function app() {
    const server = (0, fastify_1.default)({ logger: true });
    server.register(cors_1.default, {
        origin: ['http://localhost:3000'],
        // origin: ['https://anyday-frontend.vercel.app'],
        methods: ['OPTIONS'],
        credentials: true,
        strictPreflight: false,
        //allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    });
    // const port = Number(process.env.PORT) || 4000;
    const port = 8080;
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
            //console.log('Headers', request.headers);
            resp.header('Access-Control-Allow-Origin', 'http://localhost:3000');
            // resp.header('Access-Control-Allow-Origin', 'https://anyday-frontend.vercel.app');
            if ((0, graphql_helix_1.shouldRenderGraphiQL)(request)) {
                resp.header('Content-Type', 'text/html');
                resp.send((0, graphql_helix_1.renderGraphiQL)({
                    endpoint: '/graphql',
                }));
                return;
            }
            const { operationName, query, variables } = (0, graphql_helix_1.getGraphQLParameters)(request);
            //console.log(variables);
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
                //console.log(result.payload.data);
                resp.serialize(result.payload);
                resp.send(result.payload);
            }
            else {
                (0, graphql_helix_1.sendResult)(result, resp.raw);
            }
        },
    });
    server.route({
        method: ['POST', 'GET'],
        url: '/',
        handler: async (req, resp) => {
            try {
                // Your logic here
                // For example, you can send a response with a status code and a message
                resp.status(200).send("Server is running!");
            }
            catch (error) {
                // Handle errors appropriately
                console.error("Error:", error);
                resp.status(500).send("Internal Server Error");
            }
        }
    });
    server.listen({ port: port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address} on port ${port}`);
    });
}
app();
