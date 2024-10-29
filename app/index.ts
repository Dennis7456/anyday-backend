import 'graphql-import-node';
import multer from 'multer';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { Storage } from '@google-cloud/storage';
import FastifyMultipart from '@fastify/multipart';
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

// Initialize Google Cloud Storage
export const storage = new Storage();
export const bucket = storage.bucket('anyday_essay_bucket');

// Multer setup for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
});

async function app() {
  const server = fastify({ logger: true });

  server.register(FastifyMultipart);

  //Register fastify-cookie plugin
  // server.register(cookiePlugin as any);

  // CORS Configuration
  server.register(cors, {
    origin: [process.env.BASE_URL || 'https://anyday-frontend.web.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    // strictPreflight: true,
  });

  const port = Number(process.env.PORT) || 8080;

  // Handle preflight requests
  // server.options('*', (req, reply) => {
  //   reply.status(204).send();
  // });

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

      // resp.header('Access-Control-Allow-Origin', process.env.BASE_URL || 'https://anyday-frontend.web.app');

      // console.log('GraphQL Request:', {
      //   headers: request.headers,
      //   method: request.method,
      //   query: request.query,
      //   body: request.body,
      // });

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
        // console.log(resp);
      } else {
        sendResult(result, resp.raw);
        // console.log(result, resp.raw)
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

  // // File Upload Endpoint
  // server.post('/api/upload/files', async (req: FastifyRequest, reply: FastifyReply) => {
  //   try {
  //     const files = [];

  //     // Collect files from the request
  //     for await (const file of req.files()) {
  //       files.push(file);
  //     }

  //     if (files.length === 0) {
  //       return reply.status(400).send('No files uploaded.');
  //     }

  //     const uploadPromises = files.map(async (data) => {
  //       const { filename, file } = data;
  //       const mimetype = data.mimetype || 'application/octet-stream';

  //       // Log the file details
  //       console.log(`Uploading file: ${filename}`);
  //       console.log(`File type: ${mimetype}`);

  //       // Create a file object in the bucket
  //       const blob = bucket.file(filename);

  //       // Create a write stream to upload the file
  //       const blobStream = blob.createWriteStream({
  //         resumable: false,
  //       });

  //       return new Promise((resolve, reject) => {
  //         blobStream.on('error', (err) => {
  //           console.error('Error uploading file:', err);
  //           reject(err);
  //         });

  //         blobStream.on('finish', () => {
  //           const publicUrl = `https://storage.cloud.google.com/${bucket.name}/${blob.name}`;
  //           console.log(`File uploaded successfully: ${publicUrl}`);
  //           resolve(publicUrl);
  //         });

  //         // Pipe the file stream directly to the Google Cloud Storage stream
  //         file.pipe(blobStream);
  //       });
  //     });

  //     const urls = await Promise.all(uploadPromises);

  //     reply.status(200).send({ urls });
  //   } catch (error) {
  //     console.error('File upload error:', error);
  //     reply.status(500).send({ message: 'Internal Server Error' });
  //   }
  // });

  // File Upload Endpoint
  server.post('/api/upload/files', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = [];

      // Collect files from the request
      for await (const file of req.files()) {
        files.push(file);
      }

      if (files.length === 0) {
        return reply.status(400).send('No files uploaded.');
      }

      const uploadPromises = files.map(async (data) => {
        const { filename, file } = data;
        const mimetype = data.mimetype || 'application/octet-stream';

        // Log the file details
        console.log(`Uploading file: ${filename}`);
        console.log(`File type: ${mimetype}`);

        // Create a file object in the bucket
        const blob = bucket.file(filename);

        // Create a write stream to upload the file
        const blobStream = blob.createWriteStream({
          resumable: false,
        });

        return new Promise((resolve, reject) => {
          blobStream.on('error', (err) => {
            console.error('Error uploading file:', err);
            reject(err);
          });

          blobStream.on('finish', async () => {
            const publicUrl = `https://storage.cloud.google.com/${bucket.name}/${blob.name}`;

            // Get file metadata to retrieve size
            const [metadata] = await blob.getMetadata();
            const fileSize = metadata.size; // File size in bytes

            // Create a file object to return
            const fileObject = {
              id: `${Date.now()}-${filename}`, // Example ID, could use UUID or other generator
              name: filename,
              url: publicUrl,
              size: fileSize,
              type: mimetype,
            };

            console.log(`File uploaded successfully: ${publicUrl}`);
            resolve(fileObject);
          });

          // Pipe the file stream directly to the Google Cloud Storage stream
          file.pipe(blobStream);
        });
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      reply.status(200).send({ uploadedFiles });
    } catch (error) {
      console.error('File upload error:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });




  // List Files Endpoint
  server.get('/api/files', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const [files] = await bucket.getFiles(); // List all files

      const fileUrls = files.map(file => {
        return {
          filename: file.name,
          url: `https://storage.googleapis.com/${bucket.name}/${file.name}`
        };
      });

      reply.status(200).send(fileUrls);
    } catch (error) {
      console.error('Error listing files:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  //Server listening
  server.listen({ port: port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}

app();
