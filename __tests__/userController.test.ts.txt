import { userResolvers } from '../src/controllers/userController';
import { sendVerificationEmail } from '../src/services/sendVerificationEmail';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../src/services/redisClient', () => {
  return {
    setEx: jest.fn(),
    get: jest.fn(),
  };
});

jest.mock('../src/services/sendVerificationEmail');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-verification-token'),
}));

// Import the redisClient mock after defining it to avoid the error
import redisClient from '../src/services/redisClient';

describe('registerAndCreateOrder', () => {
  const input = {
    email: 'test@example.com',
    paperType: 'Essay',
    numberOfPages: 5,
    dueDate: new Date('2024-12-01'),
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should successfully send a verification email and store data in Redis', async () => {
    // Mock Redis and email function success
    (redisClient.setEx as jest.Mock).mockResolvedValue(true);
    (sendVerificationEmail as jest.Mock).mockResolvedValue(true);

    const result = await userResolvers.Mutation.registerAndCreateOrder(null, { input });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Verification Email Sent.');
    expect(result.verificationToken).toBe('mocked-verification-token');

    // Verify Redis and email were called correctly
    expect(redisClient.setEx).toHaveBeenCalledWith(
      'mocked-verification-token',
      3600,
      JSON.stringify({
        email: input.email,
        paperType: input.paperType,
        numberOfPages: input.numberOfPages,
        dueDate: input.dueDate,
      })
    );

    expect(sendVerificationEmail).toHaveBeenCalledWith(input.email, 'mocked-verification-token');
  });

  it('should handle errors and return a failure response', async () => {
    // Mock Redis to simulate an error
    (redisClient.setEx as jest.Mock).mockRejectedValue(new Error('Redis error'));

    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await userResolvers.Mutation.registerAndCreateOrder(null, { input });

    expect(result.success).toBe(false);
    expect(result.message).toBe('An error occurred while processing your request. Please try again later.');
    expect(result.verificationToken).toBeNull();

    // Ensure that Redis was called and the error was handled
    expect(redisClient.setEx).toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });
});
