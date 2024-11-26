// Mock Redis
const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

// Mock sendVerificationEmail service
jest.mock('../src/services/sendVerificationEmail');
jest.mock('uuid', () => {
  const originalModule = jest.requireActual('uuid');
  return {
    __esModule: true,
    ...originalModule,
    v4: jest.fn().mockReturnValue('mocked-verification-token'),
  };
});

// Mock Prisma Client and Role enum
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
  Role: {
    ADMIN: 'ADMIN',
    STUDENT: 'STUDENT',
  },
}));

import { Role, PrismaClient } from '@prisma/client';
import { userResolvers } from '../src/controllers/userController';
import { sendVerificationEmail } from '../src/services/sendVerificationEmail';

// Tests for registerAndCreateOrder
describe('registerAndCreateOrder', () => {
  const input = {
    email: 'test@example.com',
    paperType: 'Essay',
    numberOfPages: 5,
    dueDate: new Date('2024-12-01'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully send a verification email and store data in Redis', async () => {
    mockRedis.set.mockResolvedValue(true);
    (sendVerificationEmail as jest.Mock).mockResolvedValue(true);

    const result = await userResolvers.Mutation.registerAndCreateOrder(null, { input });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Verification Email Sent.');
    expect(result.verificationToken).toBe('mocked-verification-token');

    expect(mockRedis.set).toHaveBeenCalledWith(
      'mocked-verification-token',
      JSON.stringify({
        email: input.email,
        paperType: input.paperType,
        numberOfPages: input.numberOfPages,
        dueDate: input.dueDate.toISOString(),
      }),
      { ex: 3600 }
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(input.email, 'mocked-verification-token');
  });

  it('should handle errors and return a failure response', async () => {
    mockRedis.set.mockRejectedValue(new Error('Redis error'));

    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });
    const result = await userResolvers.Mutation.registerAndCreateOrder(null, { input });

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      'An error occurred while processing your request. Please try again later.'
    );
    expect(result.verificationToken).toBeNull();

    expect(mockRedis.set).toHaveBeenCalledWith(
      'mocked-verification-token',
      JSON.stringify({
        email: input.email,
        paperType: input.paperType,
        numberOfPages: input.numberOfPages,
        dueDate: input.dueDate.toISOString(),
      }),
      { ex: 3600 }
    );
    expect(sendVerificationEmail).not.toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });
});

// Tests for updateUser
describe('updateUser', () => {
  const mockPrisma = new PrismaClient();
  const mockUpdate = mockPrisma.user.update as jest.Mock;

  const mockContext = {
    prisma: mockPrisma,
    currentUser: {
      id: 'mock-current-user-id',
      firstName: 'Test',
      lastName: 'User',
      userName: 'test_user',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2024-01-01'),
      role: Role.ADMIN,
      password: 'hashedpassword123',
      isVerified: true,
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailNotifications: true,
      inAppNotifications: true,
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully update a user', async () => {
    const id = 'mock-user-id';
    const input = {
      firstName: 'Updated Name',
      lastName: 'Updated LastName',
      userName: 'updated_user',
      email: 'updated@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: '2024-01-01',
      role: Role.STUDENT,
    };

    const updatedUser = { id, ...input };

    mockUpdate.mockResolvedValue(updatedUser);

    const result = await userResolvers.Mutation.updateUser(null, { id, input }, mockContext);

    expect(result).toEqual(updatedUser);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id },
      data: input,
    });
  });

  it('should handle errors when updating a user', async () => {
    const id = 'mock-user-id';
    const input = {
      firstName: 'Updated Name',
      lastName: 'Updated LastName',
      userName: 'updated_user',
      email: 'updated@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: '2024-01-01',
      role: Role.STUDENT,
    };

    mockUpdate.mockRejectedValue(new Error('Update error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

    await expect(userResolvers.Mutation.updateUser(null, { id, input }, mockContext))
      .rejects.toThrow('An error occurred while updating the user.');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id },
      data: input,
    });
    consoleErrorSpy.mockRestore();
  });
});

// Tests for deleteUser
describe('deleteUser', () => {
  const mockPrisma = new PrismaClient();
  const mockDelete = mockPrisma.user.delete as jest.Mock;

  const mockContext = {
    prisma: mockPrisma,
    currentUser: {
      id: 'mock-current-user-id',
      firstName: 'Test',
      lastName: 'User',
      userName: 'test_user',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2024-01-01'),
      role: Role.ADMIN,
      password: 'hashedpassword123',
      isVerified: true,
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailNotifications: true,
      inAppNotifications: true,
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully delete a user', async () => {
    const id = 'mock-user-id';

    mockDelete.mockResolvedValue({});

    const result = await userResolvers.Mutation.deleteUser(null, { id }, mockContext);

    expect(result).toEqual({ message: 'User deleted successfully' });
    expect(mockContext.prisma.user.delete).toHaveBeenCalledWith({ where: { id } });
  });

  it('should handle errors when deleting a user', async () => {
    const id = 'mock-user-id';

    mockDelete.mockRejectedValue(new Error('Delete error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

    await expect(userResolvers.Mutation.deleteUser(null, { id }, mockContext))
      .rejects.toThrow('An error occurred while deleting the user.');

    expect(mockContext.prisma.user.delete).toHaveBeenCalledWith({ where: { id } });

    consoleErrorSpy.mockRestore();
  });
});
