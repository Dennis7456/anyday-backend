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
  let redisMock: jest.Mocked<Redis>;

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
  
    // Mock Redis to return valid cached data for the token
    redisMock.get.mockResolvedValueOnce(mockCachedData);
  
    // Mock Redis to delete the token successfully
    redisMock.del.mockResolvedValueOnce(1);
  
    // Call the function with only the token
    const result = await userResolvers.Mutation.completeRegistration(null, { token: mockToken }, { redis: redisMock });
  
    // Verify Redis.get is called with the correct token
    expect(redisMock.get).toHaveBeenCalledWith(mockToken);
  
    // Verify Redis.del is called to delete the token
    expect(redisMock.del).toHaveBeenCalledWith(mockToken);
  
    // Verify the function returns the correct success response
    expect(result).toEqual({
      valid: true,
      message: 'Registration completed successfully and order created.',
    });
  });

  it('should return an error if the token is invalid or expired', async () => {
    const mockToken = 'invalid-token';
  
    // Mock Redis to return null for an expired or invalid token
    redisMock.get.mockResolvedValueOnce(null);
  
    // Call the function with the invalid token
    const result = await userResolvers.Mutation.completeRegistration(null, { token: mockToken }, { redis: redisMock });
  
    // Verify Redis.get is called with the correct token
    expect(redisMock.get).toHaveBeenCalledWith(mockToken);
  
    // Verify the function returns the expected error response
    expect(result).toEqual({
      valid: false,
      message: 'Invalid or expired token.',
    });
  });

  it('should handle Redis errors gracefully', async () => {
    const mockToken = 'error-token';
  
    // Mock Redis to throw an error
    redisMock.get.mockRejectedValueOnce(new Error('Redis error'));
  
    // Call the function and expect it to throw an error
    await expect(userResolvers.Mutation.completeRegistration(null, { token: mockToken }, { redis: redisMock }))
      .rejects.toThrow('An error occurred while completing registration.');
  
    // Verify Redis.get is called with the correct token
    expect(redisMock.get).toHaveBeenCalledWith(mockToken);
  
    // Ensure Redis.del is not called, as the process should halt on error
    expect(redisMock.del).not.toHaveBeenCalled();
  });
  
});
