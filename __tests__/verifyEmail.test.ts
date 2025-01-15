jest.mock('@upstash/redis', () => {
  const mockRedis = {
    get: jest.fn(),
  };
  return {
    Redis: jest.fn(() => mockRedis),
    __mock__: { mockRedis }, // Expose mockRedis for internal use
  };
});

import { frontEndUrl } from '../src/config/config';
import { userResolvers } from '../src/controllers/userController';
import { Redis } from '@upstash/redis';

// Access mockRedis from the mock implementation
const { __mock__: { mockRedis } } = jest.requireMock('@upstash/redis');

describe('verifyEmail', () => {
  const validToken = 'valid-token';
  const invalidToken = 'invalid-token';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return valid response for a valid token', async () => {
    const cachedData = JSON.stringify({
      email: 'test@example.com',
      paperType: 'Essay',
      numberOfPages: 5,
      dueDate: '2024-12-01',
    });

    mockRedis.get.mockResolvedValue(cachedData);

    const result = await userResolvers.Mutation.verifyEmail(null, { token: validToken });

    expect(result.valid).toBe(true);
    expect(result.message).toBe('Email verified. Please complete your registration.');
    expect(result.redirectUrl).toBe(`${frontEndUrl}/complete-registration`);
    expect(result.token).toBe(validToken);

    // Ensure Redis was called with the correct token
    expect(mockRedis.get).toHaveBeenCalledWith(validToken);
  });

  it('should return invalid response for an invalid or expired token', async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await userResolvers.Mutation.verifyEmail(null, { token: invalidToken });

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid or expired token.');
    expect(result.redirectUrl).toBe('#');
    expect(result.token).toBe('');

    // Ensure Redis was called with the correct token
    expect(mockRedis.get).toHaveBeenCalledWith(invalidToken);
  });
});
