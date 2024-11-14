import fastify, { FastifyInstance } from 'fastify';
import {createServer} from '../src/index';
import supertest from 'supertest'
import { registerIndexRoute } from '../src/routes/indexRoute';

jest.mock('node-mailjet', () => ({
  apiConnect: jest.fn(() => ({
    post: jest.fn().mockReturnThis(),
    request: jest.fn().mockResolvedValue({ body: { success: true } }),
  }))
}))

describe('GraphQL Server', () => {
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    server = createServer()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('should return a valid response for a GraphQL query', async () => {
    const query = `
      query {
        info
      }
    `

    const response = await supertest(server.server)
      .post('/graphql')
      .send({ query })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data.info')
  })

  it('should return the GraphiQL interface on GET requests', async () => {
    const response = await supertest(server.server)
    .get('/graphql')
    .set('Host', 'localhost:4000') // Include Host header as in the browser request
    .set('Connection', 'keep-alive')
    .set('Cache-Control', 'max-age=0')
    .set('Sec-CH-UA', '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"')
    .set('Sec-CH-UA-Mobile', '?0')
    .set('Sec-CH-UA-Platform', '"Linux"')
    .set('Dnt', '1')
    .set('Upgrade-Insecure-Requests', '1')
    .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
    .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7')
    .set('Sec-Fetch-Site', 'none')
    .set('Sec-Fetch-Mode', 'navigate')
    .set('Sec-Fetch-User', '?1')
    .set('Sec-Fetch-Dest', 'document')
    .set('Accept-Encoding', 'gzip, deflate, br, zstd')
    .set('Accept-Language', 'en-GB,en;q=0.9');

    expect(response.statusCode).toBe(200)
    expect(response.header['content-type']).toContain('text/html')
    expect(response.text).toContain('<title>GraphiQL</title>')
  })
})

describe('indexRoute', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    // Create a fresh Fastify server instance for each test
    server = fastify();
    // Register the index route
    registerIndexRoute(server);
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
    // console.log(response)
    expect(response.statusMessage).toBe('Internal Server Error');
  });
});