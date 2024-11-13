import { userResolvers } from '../src/controllers/userController';
import { hash } from 'bcryptjs';
import { GraphQLContext } from '../src/context/context';
import { PrismaClient } from '@prisma/client';

// Mock the dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

// Define the mock for `prisma.user.create`
const mockPrismaCreate = jest.fn();

// Define a mock `currentUser`, set to null or an example user
const mockCurrentUser = null; // Or, if needed, an example user: { id: '123', userName: 'john_doe' }

const context: GraphQLContext = {
  prisma: {
    user: {
      create: mockPrismaCreate,
    },
  } as unknown as PrismaClient, // Cast `prisma` as `PrismaClient` to satisfy TypeScript
  currentUser: mockCurrentUser, // Add `currentUser` to the context
};

describe('createStudent', () => {
  const input = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '1234567890',
    dateOfBirth: new Date('2000-01-01'),
    password: 'password@123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create a student successfully', async () => {
    (hash as jest.Mock).mockResolvedValue('hashedPassword');
    mockPrismaCreate.mockResolvedValue({
      ...input,
      id: '1',
      userName: 'john_doe_1234', // Ensure this follows the expected pattern or use the matcher
      role: 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await userResolvers.Mutation.createStudent(null, { input }, context);

    expect(hash).toHaveBeenCalledWith(input.password, 10);
    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        userName: expect.stringMatching(/^john_doe_\d{4}$/), // Ensure pattern matching
        email: input.email,
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth,
        password: 'hashedPassword',
        role: 'STUDENT',
        createdAt: expect.any(Date), // Allow for any date object
        updatedAt: expect.any(Date), // Allow for any date object
      },
    });
    expect(result).toEqual(expect.objectContaining({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    }));
  });

  it('should throw an error if required fields are missing', async () => {
    const invalidInput = { ...input, firstName: '' };
    await expect(userResolvers.Mutation.createStudent(null, { input: invalidInput }, context)).rejects.toThrow(
      'All fields are required.'
    );
    expect(mockPrismaCreate).not.toHaveBeenCalled();
  });

  it('should throw an error if there is a database error', async () => {
    (hash as jest.Mock).mockResolvedValue('hashedPassword');
    
    // Reject the Prisma mock with a database error
    mockPrismaCreate.mockRejectedValue(new Error('Database error'));
  
    // Wrap the call in an async assertion to ensure it's caught
    await expect(userResolvers.Mutation.createStudent(null, { input }, context))
      .rejects
      .toThrow('An error occurred while creating the student.');
  
    // Ensure the mock was called
    expect(mockPrismaCreate).toHaveBeenCalled();
  });
});
