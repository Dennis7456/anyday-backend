// __tests__/verifyEmail.test.ts
jest.mock('redis', () => {
  const mRedisClient = {
    connect: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  return {
    createClient: jest.fn(() => mRedisClient),
  };
});

import { userResolvers } from '../src/controllers/userController';
import { redisClient } from '../src/services/redisClient';

describe('verifyEmail', () => {
  const validToken = 'valid-token';
  const invalidToken = 'invalid-token';

  const mockedRedisClient = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });


  it('should return valid response for a valid token', async () => {
    const cachedData = JSON.stringify({
      email: 'test@example.com',
      paperType: 'Essay',
      numberOfPages: 5,
      dueDate: new Date('2024-12-01'),
    });

    mockedRedisClient.get.mockResolvedValue(cachedData);

    const result = await userResolvers.Mutation.verifyEmail(null, { token: validToken });

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Email verified. Please complete your registration.');
    expect(result.redirectUrl).toBe(`${process.env.BASE_URL}/complete-registration`);
    expect(result.token).toBe(validToken);

    // Ensure Redis was called with the correct token
    expect(redisClient.get).toHaveBeenCalledWith(validToken);
  });

  it('should return invalid response for an invalid or expired token', async () => {
    mockedRedisClient.get.mockResolvedValue(null);

    const result = await userResolvers.Mutation.verifyEmail(null, { token: invalidToken });

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid or expired token.');
    expect(result.redirectUrl).toBe('#');
    expect(result.token).toBe('');

    // Ensure Redis was called with the correct token
    expect(redisClient.get).toHaveBeenCalledWith(invalidToken);
  });
});
