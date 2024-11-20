import fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { registerIndexRoute } from '../src/routes/indexRoute';
import { registerGraphQLRoute } from '../src/routes/graphqlRoute';
import { registerGetRedisDataRoute } from '../src/routes/getRedisDataRoute';
import { registerUploadFilesRoute } from '../src/routes/uploadFilesRoute';
import path from 'path'; // Import 'path' module
import fs from 'fs'; // Import 'fs' module
import supertest from 'supertest'; // Import 'supertest' for HTTP testing

describe('Fastify Server', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = fastify();
    server.register(multipart);
    // Register necessary routes
    registerIndexRoute(server);

    await server.ready();
  });

  afterEach(async () => {
    // Close the server after each test
    await server.close();
  });

  it('should return "Server is running!" when the root endpoint is accessed', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200); // Check that status is 200 OK
    expect(response.body).toBe('Server is running!'); // Check the response body
  });

  it('should return 500 if an error occurs in the handler', async () => {
    // Simulate an error by modifying the route handler to throw an error
    const erroringServer = fastify();
    erroringServer.route({
      method: 'GET',
      url: '/',
      handler: async (req, resp) => {
        throw new Error('Simulated error');
      },
    });

    // Registering the error route
    await erroringServer.ready();

    const response = await erroringServer.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
  });
});
