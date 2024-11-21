import fastify, { FastifyInstance } from 'fastify';
import { registerGetRedisDataRoute } from '../src/routes/getRedisDataRoute';
import { Redis } from '@upstash/redis';

jest.mock('@upstash/redis'); // Mock the @upstash/redis module

describe('GET Redis Data Route', () => {
  let server: FastifyInstance;
  let redisMock: jest.Mocked<Redis>;

  beforeAll(() => {
    // Suppress console.log output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks(); // Restore console.log after tests
  });

  beforeEach(() => {
    // Create a mock Redis client
    redisMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    // Create a new Fastify instance for each test
    server = fastify();

    // Register the route
    registerGetRedisDataRoute(server, redisMock);
  });

  afterEach(async () => {
    // Close the server after each test
    await server.close();
  });

  it('should return 401 if token is not provided', async () => {
    const mockToken = 'valid-token';

    // Mock Redis client to return null when fetching the user data
    const response = await server.inject({
      method: 'POST',
      url: '/api/redis/user-data',
      headers: {
        Authorization: ``,
      },
    });

    expect(response.statusCode).toBe(401); // Expect Unauthorized status code
    expect(response.body).toBe('Token is required'); // Expect token error message
  });

  it('should return 404 if user data is not found in Redis', async () => {
    const mockToken = 'valid-token';

    // Mock Redis client to return null when fetching the user data
    redisMock.get.mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: '/api/redis/user-data',
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    });

    expect(response.statusCode).toBe(404); // Expect Not Found status code
    expect(response.body).toBe('User data not found'); // Expect user data not found message
  });

  it('should return 200 and user data if found in Redis', async () => {

    const mockToken = 'valid-token';

    const mockUserData = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Mock Redis client to return the mock user data when fetching with the token
    redisMock.get.mockResolvedValueOnce(JSON.stringify(mockUserData));

    const response = await server.inject({
      method: 'POST',
      url: '/api/redis/user-data',
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    });

    expect(response.statusCode).toBe(200); // Expect OK status code
    expect(JSON.parse(response.body)).toEqual(mockUserData); // Expect the user data returned to match mock
  });

  it('should return 500 if an error occurs during Redis interaction', async () => {
    const mockToken = 'valid-token';

    // Mock Redis client to throw an error when attempting to get user data
    redisMock.get.mockRejectedValue(new Error('Redis error'));

    const response = await server.inject({
      method: 'POST',
      url: '/api/redis/user-data',
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    });

    expect(response.statusCode).toBe(500); // Expect Internal Server Error status code
    expect(response.body).toBe('Internal Server Error'); // Expect general error message
  });
});
