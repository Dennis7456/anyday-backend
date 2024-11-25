jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      del: jest.fn(),
    })),
  };
});

import fastify, { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { userResolvers } from '../src/controllers/userController'; // Adjust the import path if necessary
import { Redis } from '@upstash/redis';

describe('completeRegistration', () => {
  let server: FastifyInstance;
  // let redisMock: jest.Mocked<Redis>;
  let redisMock: jest.Mocked<Redis>

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Redis instance
    redisMock = new Redis({ url: 'mock-url', token: 'mock-token' }) as jest.Mocked<Redis>;

    // Set up Fastify server
    server = fastify();

    // Define and register the userResolver plugin
    const userResolverPlugin = fp(async (server, opts: { redis: jest.Mocked<Redis> }) => {
      server.decorate('userResolvers', userResolvers);
      server.decorate('redis', opts.redis);
    });

    // Register the plugin with mock Redis
    server.register(userResolverPlugin, { redis: redisMock });

    // Wait for the server to be ready
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('should complete registration successfully and delete token from Redis', async () => {
    const mockToken = 'valid-token';
    const mockCachedData = JSON.stringify({
      email: 'test@example.com',
      paperType: 'Essay',
      numberOfPages: 5,
      dueDate: '2024-12-01',
    });

    // Mock Redis responses
    redisMock.get.mockResolvedValueOnce(mockCachedData);
    redisMock.del.mockResolvedValueOnce(1);

    // Call the resolver function
    const result = await userResolvers.Mutation.completeRegistration(
      null,
      { token: mockToken },
      { redisClient: redisMock }
    );

    // Assertions
    expect(redisMock.get).toHaveBeenCalledWith(mockToken);
    expect(redisMock.del).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual({
      valid: true,
      message: 'Registration completed successfully and order created.',
    });
  });

  it('should return an error if the token is invalid or expired', async () => {
    const mockToken = 'invalid-token';

    // Mock Redis to return null
    redisMock.get.mockResolvedValueOnce(null);

    // Call the resolver function
    const result = await userResolvers.Mutation.completeRegistration(
      null,
      { token: mockToken },
      { redisClient: redisMock }
    );

    // Assertions
    expect(redisMock.get).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual({
      valid: false,
      message: 'Invalid or expired token.',
    });
  });

  it('should handle Redis errors gracefully', async () => {
    const mockToken = 'error-token';

    // Mock Redis to throw an error
    redisMock.get.mockRejectedValueOnce(new Error('Redis error'));

    // Suppress console.error for this test
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Call the resolver function and expect it to throw
    await expect(
      userResolvers.Mutation.completeRegistration(null, { token: mockToken }, { redisClient: redisMock })
    ).rejects.toThrow('An error occurred while completing registration.');

    // Assertions
    expect(redisMock.get).toHaveBeenCalledWith(mockToken);
    expect(redisMock.del).not.toHaveBeenCalled();

    // Restore console.error
  consoleErrorSpy.mockRestore();
  });
  
});
