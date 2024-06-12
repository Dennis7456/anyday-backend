import 'graphql-import-node';
import fastify from 'fastify';
import cors from '@fastify/cors'
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  Request,
  sendResult,
  shouldRenderGraphiQL,
  sendResponseResult
} from 'graphql-helix';
import { schema } from './schema';
import { contextFactory } from './context';
// import { SpeedInsights } from "@vercel/speed-insights/next"

async function app() {
  const server = fastify({ logger: true });

  server.register(cors, {

    // origin: ['http://localhost:3000'],
    origin: ['https://anyday-frontend.vercel.app'],
    methods: ['OPTIONS'],
    credentials: true,
    strictPreflight: false,
    //allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  })

  const port = 4000;

  server.route({
    method: ['POST', 'GET'],
    url: '/graphql',
    handler: async (req, resp) => {
      const request: Request = {
        headers: req.headers,
        method: req.method,
        query: req.query,
        body: req.body,
      };
      //console.log('Headers', request.headers);
      // resp.header('Access-Control-Allow-Origin', 'http://localhost:3000');
      resp.header('Access-Control-Allow-Origin', 'https://anyday-frontend.vercel.app');

      if (shouldRenderGraphiQL(request)) {
        resp.header('Content-Type', 'text/html');
        resp.send(
          renderGraphiQL({
            endpoint: '/graphql',
          })
        );

        return;
      }
      const { operationName, query, variables } = getGraphQLParameters(request);

      //console.log(variables);

      const result = await processRequest({
        request,
        schema,
        operationName,
        contextFactory: () => contextFactory(req),
        query,
        variables,

      });


      if (result.type === "RESPONSE") {
        result.headers.forEach(({ name, value }) => {
          resp.header(name, value)

        });
        resp.status(result.status);
        //console.log(result.payload.data);
        resp.serialize(result.payload);
        resp.send(result.payload);

      } else {
        sendResult(result, resp.raw);
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
      } catch (error) {
        // Handle errors appropriately
        console.error("Error:", error);
        resp.status(500).send("Internal Server Error");
      }
    }
  })

  server.listen({ port: port }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}

app();
