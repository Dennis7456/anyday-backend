import 'graphql-import-node';
import fastify from 'fastify';
// import cookiePlugin from 'fastify-cookie';
import cors from '@fastify/cors';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  Request,
  sendResult,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import { graphql } from 'graphql';
import { schema } from './schema';
import { contextFactory } from './context';
import Client from './redisClient';
import redisClient from './redisClient';

interface VerifyEmailQuery {
  token: string;
}

interface VerifyEmailResponse {
  verifyEmail: {
    valid: boolean;
    message: string;
    redirectUrl?: string;
    token: string;
  };
}

async function app() {
  const server = fastify({ logger: true });

  //Register fastify-cookie plugin
  // server.register(cookiePlugin as any);

  // CORS Configuration
  server.register(cors, {
    origin: [process.env.BASE_URL || 'https://anyday-frontend.web.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    strictPreflight: true,
  });

  const port = Number(process.env.PORT) || 8080;

  // Handle preflight requests
  server.options('*', (req, reply) => {
    reply.status(204).send();
  });

  // GraphQL Endpoint
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

      resp.header('Access-Control-Allow-Origin', process.env.BASE_URL || 'https://anyday-frontend.web.app');

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
          resp.header(name, value);
        });
        resp.status(result.status);
        resp.serialize(result.payload);
        resp.send(result.payload);
      } else {
        sendResult(result, resp.raw);
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
      } catch (error) {
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
      const query = req.query as unknown as VerifyEmailQuery;
      const token = query.token;

      if (!token) {
        reply.status(400).send('Token is required');
        return;
      }

      try {
        // Execute GraphQL mutation directly
        const result = await graphql({
          schema,
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
          contextValue: await contextFactory(req),
        });

        if (result.errors) {
          console.error("GraphQL Errors:", result.errors);
          reply.status(400).send('Verification failed');
          return;
        }

        // Safe type assertion and handling
        const data = result.data as unknown;

        if (data && typeof data === 'object' && 'verifyEmail' in data) {
          const { valid, message, redirectUrl, token } = (data as VerifyEmailResponse).verifyEmail;
          if (valid) {
            // Return a JSON response with the redirect URL
            // resp.status(200).send({ redirectUrl });
            // reply.header('Set-Cookie', `token=${token}; Path=/; HttpOnly`);
            reply.header('Set-Cookie', `token=${token}; Path=/;`);
            reply.redirect(redirectUrl || '/');
          } else {
            reply.status(400).send(message || 'Verification failed');
          }
        } else {
          reply.status(400).send('Invalid response structure');
        }
      } catch (error) {
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
      const token = req.headers.authorization?.split(' ')[1];
      console.log(req.headers)
      if (!token) {
        reply.status(401).send('Token is required');
        return;
      }

      try {
        const userData = await redisClient.get(token);

        if (userData) {
          reply.send(JSON.parse(userData));
        } else {
          reply.status(404).send('User data not found');
        }
      }
      catch (error) {
        console.log('Error fetching user data from Redis:', error);
        reply.status(500).send('Internal Server Error');
      }
    }
  })

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
