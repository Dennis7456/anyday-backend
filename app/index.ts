import 'graphql-import-node';
import multer from 'multer';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { Storage } from '@google-cloud/storage';
import FastifyMultipart, { MultipartFile } from '@fastify/multipart';
import fastifyMulter from 'fastify-multer';
import fastifyMultipart from '@fastify/multipart';
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
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fastifyStatic from '@fastify/static';

dotenv.config();

const localUploadDir = path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads')

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
export const bucket = storage.bucket('anyday-essay-bucket');



// Multer setup for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
});

async function app() {
  const server = fastify({ logger: true });

  // server.register(FastifyMultipart);

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

  // Register @fastify/multipart
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB limit
    },
  });


  const upload = fastifyMulter({ dest: localUploadDir });

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
      // console.log(req.headers)
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

        if (process.env.NODE_ENV === 'development') {
          // Save files locally during development
          const uploadDir = path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const localFilePath = path.join(uploadDir, filename);
          const writeStream = fs.createWriteStream(localFilePath);

          // Pipe the file stream to the local file system
          file.pipe(writeStream);

          return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
              const fileObject = {
                id: `${Date.now()}-${filename}`, // Generate an ID
                name: filename,
                url: localFilePath,
                size: fs.statSync(localFilePath).size.toString(), // Ensure size is a string
                type: mimetype,
              };

              console.log(`File saved locally: ${localFilePath}`);
              resolve(fileObject);
            });

            writeStream.on('error', (err) => {
              console.error('Error saving file locally:', err);
              reject(err);
            });
          });
        } else {
          // In production, upload to Google Cloud Storage
          const blob = bucket.file(filename);
          const blobStream = blob.createWriteStream({
            resumable: true,
            gzip: true,
            metadata: {
              contentType: mimetype,
            }
          });

          return new Promise((resolve, reject) => {
            blobStream.on('error', (err) => {
              console.error('Error uploading file:', err);
              reject(err);
            });

            blobStream.on('finish', async () => {
              const publicUrl = `https://storage.cloud.google.com/${bucket.name}/${blob.name}`;
              const [metadata] = await blob.getMetadata();
              const fileSize = metadata.size;

              const fileObject = {
                id: `${Date.now()}-${filename}`, // Generate an ID
                name: filename,
                url: publicUrl,
                size: fileSize?.toString(), // Ensure size is a string
                type: mimetype,
              };

              console.log(`File uploaded successfully: ${publicUrl}`);
              resolve(fileObject);
            });

            file.pipe(blobStream);
          });
        }
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
      let fileUrls = [];

      if (process.env.NODE_ENV === 'production') {
        // Production: List files from Google Cloud Storage
        const [files] = await bucket.getFiles(); // List all files

        fileUrls = files.map(file => {
          return {
            filename: file.name,
            url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          };
        });
      } else {
        // Development: List files from the local uploads directory
        const uploadDir = path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');

        // Read the directory to get a list of files
        if (fs.existsSync(uploadDir)) {
          const files = fs.readdirSync(uploadDir);

          fileUrls = files.map(filename => {
            return {
              filename,
              url: `${uploadDir}/${filename}`, // Local file path for development
            };
          });
        } else {
          return reply.status(400).send('Upload directory not found.');
        }
      }

      // Send the list of files as a response
      reply.status(200).send(fileUrls);
    } catch (error) {
      console.error('Error listing files:', error);
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Register fastify-static plugin
  server.register(fastifyStatic, {
    root: path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads'),
    prefix: '/uploads/', // The URL prefix for serving files
  });

  // Route to access uploaded files
  server.get('/uploads/:filename', async (req, reply) => {
    const { filename } = req.params as { filename: string };
    const filePath = path.join(process.env.LOCAL_UPLOAD_DIR || './uploads', filename);

    try {
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        reply.status(404).send('File not found');
        return;
      }

      // Send the file
      return reply.sendFile(filename);
    } catch (error) {
      console.error('Error serving file:', error);
      reply.status(500).send('Internal Server Error');
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
