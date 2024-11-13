import { GraphQLContext } from '../../src/context/context';
import { gql } from 'apollo-server';
import { PrismaClient } from '@prisma/client';
import { userResolvers } from '../../src/controllers/userController';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { APP_SECRET } from '../../src/config/config'; // Uses the default 'SASQUATCH'

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockImplementation((payload, secret, options) => {

    // Ensure we are passing 'SASQUATCH' as the secret
    expect(secret).toBe('SASQUATCH');
    return 'mockedToken';
  }),
}));

const mockPrismaCreate = jest.fn();
const mockPrismaFindUnique = jest.fn();
const mockCurrentUser = null;

const context: GraphQLContext = {
  prisma: {
    user: {
      create: mockPrismaCreate,
      findUnique: mockPrismaFindUnique,
    },
  } as unknown as PrismaClient,
  currentUser: mockCurrentUser,
};

describe('Authentication', () => {
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
  });

  beforeAll(async () => {
    (hash as jest.Mock).mockResolvedValue('hashedPassword');
    mockPrismaCreate.mockResolvedValue({
      ...input,
      id: '1',
      userName: 'john_doe_1234',
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
        userName: expect.stringMatching(/^john_doe_\d{4}$/),
        email: input.email,
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth,
        password: 'hashedPassword',
        role: 'STUDENT',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(result).toEqual(expect.objectContaining({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    }));
  });

  it('logs in a user and returns a token', async () => {
    const loginInput = {
      email: 'john.doe@example.com',
      password: 'password@123',
    };

    mockPrismaFindUnique.mockResolvedValue({
      id: '1',
      ...input,
      password: 'hashedPassword',
    });

    (compare as jest.Mock).mockResolvedValue(true); 
    (jwt.sign as jest.Mock).mockReturnValue('mockedJwtToken'); 

    const loginMutation = gql`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
        }
      }
    `;

    const result = await userResolvers.Mutation.login(null, { ...loginInput }, context);

    expect(compare).toHaveBeenCalledWith(loginInput.password, 'hashedPassword');

    // Ensure jwt.sign is called with the correct APP_SECRET (which is 'SASQUATCH' by default)
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: '1' },
      'SASQUATCH', // The value from the config file
    );

    expect(result).toEqual({
      token: 'mockedJwtToken',
      user: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'hashedPassword',
      }
    });
  });
});
