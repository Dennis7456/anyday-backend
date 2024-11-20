import { userResolvers } from '../src/controllers/userController';
import redisClient from '../src/services/redisClient';

// Mock the dependencies
jest.mock('../src/services/redisClient');

describe('completeRegistration', () => {
  const token = 'mocked-verification-token';
  const cachedData = {
    email: 'test@example.com',
    paperType: 'Essay',
    numberOfPages: 5,
    dueDate: new Date('2024-12-01').toISOString(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should complete registration successfully and delete token from Redis', async () => {
    // Mock Redis get and del methods for success case
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
    (redisClient.del as jest.Mock).mockResolvedValue(1); // Simulates successful deletion

    const result = await userResolvers.Mutation.completeRegistration(null, { token });

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Registration completed successfully and order created.');

    // Verify Redis methods were called correctly
    expect(redisClient.get).toHaveBeenCalledWith(token);
    expect(redisClient.del).toHaveBeenCalledWith(token);
  });

  it('should throw an error when the token is invalid or expired', async () => {
    // Mock Redis get to simulate a missing token
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    await expect(userResolvers.Mutation.completeRegistration(null, { token }))
      .rejects.toThrow('Invalid or expired token');

    // Verify Redis get was called, and del was not called
    expect(redisClient.get).toHaveBeenCalledWith(token);
    expect(redisClient.del).not.toHaveBeenCalled();
  });
});
