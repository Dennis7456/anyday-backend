jest.mock('../src/services/redisClient', () => ({
  redisClient: {
    get: jest.fn(),
    del: jest.fn(),
  },
}));

import { userResolvers } from '../src/controllers/userController';
import { redisClient } from '../src/services/redisClient';

describe('completeRegistration', () => {
  const token = 'valid-token';
  const cachedData = {
    email: 'test@example.com',
    paperType: 'Essay',
    numberOfPages: 5,
    dueDate: '2024-12-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete registration successfully and delete token from Redis', async () => {
    // Mock Redis get and del methods for success case
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
    (redisClient.del as jest.Mock).mockResolvedValue(1); // Simulates successful deletion

    const result = await userResolvers.Mutation.completeRegistration(null, { token });

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Registration completed successfully and order created.');

    // Ensure Redis was called with the correct token
    expect(redisClient.get).toHaveBeenCalledWith(token);
    expect(redisClient.del).toHaveBeenCalledWith(token);
  });

  it('should return an error if the token is invalid or expired', async () => {
    // Mock Redis to return null for the invalid token
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    try {
      await userResolvers.Mutation.completeRegistration(null, { token });
    } catch (error: any) {
      expect(error.message).toBe('Invalid or expired token.');
    }

    // Ensure Redis get was called with the correct token
    expect(redisClient.get).toHaveBeenCalledWith(token);
    expect(redisClient.del).not.toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    // Mock Redis to throw an error
    (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error.'));

    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });

    try {
      await userResolvers.Mutation.completeRegistration(null, { token });
    } catch (error: any) {
      expect(error.message).toBe('Redis error.');
    }

    // Ensure Redis get was called
    expect(redisClient.get).toHaveBeenCalledWith(token);
    expect(redisClient.del).not.toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });
});
