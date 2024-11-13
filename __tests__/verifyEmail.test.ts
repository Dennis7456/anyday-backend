import { userResolvers } from '../src/controllers/userController';
import redisClient from '../src/services/redisClient';

// Mock redisClient
jest.mock('../src/services/redisClient', () => ({
  get: jest.fn(),
}));

describe('verifyEmail', () => {
  const validToken = 'valid-token';
  const invalidToken = 'invalid-token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid response for a valid token', async () => {
    const cachedData = JSON.stringify({
      email: 'test@example.com',
      paperType: 'Essay',
      numberOfPages: 5,
      dueDate: new Date('2024-12-01'),
    });

    // Mock Redis to return cached data for the valid token
    (redisClient.get as jest.Mock).mockResolvedValue(cachedData);

    const result = await userResolvers.Mutation.verifyEmail(null, { token: validToken });

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Email verified. Please complete your registration.');
    expect(result.redirectUrl).toBe(`${process.env.BASE_URL}/complete-registration`); // Ensure that the URL is correct
    expect(result.token).toBe(validToken);

    // Ensure Redis was called with the correct token
    expect(redisClient.get).toHaveBeenCalledWith(validToken);
  });

  it('should return invalid response for an invalid or expired token', async () => {
    // Mock Redis to return null for the invalid token
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    const result = await userResolvers.Mutation.verifyEmail(null, { token: invalidToken });

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid or expired token.');
    expect(result.redirectUrl).toBe('#');
    expect(result.token).toBe('');

    // Ensure Redis was called with the correct token
    expect(redisClient.get).toHaveBeenCalledWith(invalidToken);
  });
});
