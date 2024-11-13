import { gql } from 'apollo-server';
import { orderResolvers } from '../src/controllers/orderController'; // Adjust path as needed
import { GraphQLContext } from '../src/context/context'; // Your GraphQL context
import { sendOrderSuccessEmail } from '../src/services/sendOrderSuccessEmail'; // Mock email service
import { PrismaClient } from '@prisma/client';

jest.mock('../src/services/sendOrderSuccessEmail', () => ({
  sendOrderSuccessEmail: jest.fn(),
}));

// Mocking Prisma client methods
const mockPrisma = {
  order: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  file: {
    findMany: jest.fn(),
  },
};

// Mock GraphQL context
const mockContext: GraphQLContext = {
  prisma: mockPrisma as unknown as PrismaClient,
  // redisClient: { get: jest.fn(), set: jest.fn() },
  currentUser: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    userName: 'johndoe',
    email: 'student@example.com',
    phoneNumber: '123-456-7890',
    dateOfBirth: new Date('2000-01-01'),
    password: 'hashedpassword',
    role: 'STUDENT',  // Assuming 'Role' is a string, change as needed
    isVerified: true,
    profilePicture: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailNotifications: true,
    inAppNotifications: true,
  },
};

describe('Order Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches all orders for the authenticated user', async () => {
    // Mock the return value for finding orders
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: '1',
        studentId: '1',
        instructions: 'Test order 1',
        paperType: 'Essay',
        numberOfPages: 5,
        dueDate: new Date(),
        totalAmount: 100,
        depositAmount: 50,
        status: 'PENDING',
        uploadedFiles: [],
      },
    ]);

    const query = gql`
      query GetOrders {
        orders {
          id
          instructions
          paperType
          numberOfPages
          dueDate
          totalAmount
          depositAmount
          status
        }
      }
    `;

    const result = await orderResolvers.Query.orders(null, {}, mockContext);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].instructions).toBe('Test order 1');
  });

  it('creates a new order with authentication', async () => {
    const createOrderInput = {
      studentId: '1',
      instructions: 'Test order 2',
      paperType: 'Research Paper',
      numberOfPages: 10,
      dueDate: new Date(),
      uploadedFiles: [
        {
          url: 'http://example.com/file1.pdf',
          name: 'file1.pdf',
          size: '1MB',
          type: 'application/pdf',
        },
      ],
    };

    // Mock the return value for finding the student (this ensures the student exists)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'student@example.com',
    });

    // Mock the return value for order creation
    mockPrisma.order.create.mockResolvedValue({
      id: '2',
      studentId: '1',
      instructions: 'Test order 2',
      paperType: 'Research Paper',
      numberOfPages: 10,
      dueDate: new Date(),
      totalAmount: 200, // Assuming 20 per page
      depositAmount: 100, // 50% deposit
      status: 'PENDING',
      uploadedFiles: [
        {
          url: 'http://example.com/file1.pdf',
          name: 'file1.pdf',
          size: '1MB',
          type: 'application/pdf',
        },
      ],
    });

    const mutation = gql`
      mutation CreateOrder($input: CreateOrderInput!) {
        createOrder(input: $input) {
          success
          message
          order {
            id
            instructions
            paperType
            numberOfPages
            totalAmount
            depositAmount
          }
        }
      }
    `;

    const variables = {
      input: createOrderInput,
    };

    const result = await orderResolvers.Mutation.createOrder(null, variables, mockContext);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Order created successfully. A confirmation email has been sent.');
    expect(result.order).toHaveProperty('id', '2');
    expect(result.order.totalAmount).toBe(200);
    expect(sendOrderSuccessEmail).toHaveBeenCalledWith(
      'student@example.com',
      'Test order 2',
      'Research Paper',
      10,
      expect.any(String), // for the due date
      200,
      100,
      'PENDING',
      expect.any(Array), // uploadedFiles
    );
  });

  it('throws error if student is not found when creating an order', async () => {
    const createOrderInput = {
      studentId: '999', // Invalid student ID
      instructions: 'Test order 3',
      paperType: 'Essay',
      numberOfPages: 5,
      dueDate: new Date(),
      uploadedFiles: [],
    };

    // Mock the return value for finding the student (student does not exist)
    mockPrisma.user.findUnique.mockResolvedValue(null);

    try {
      await orderResolvers.Mutation.createOrder(null, { input: createOrderInput }, mockContext);
    } catch (error) {
      //Check error type (Typescript error handling)
      if (error instanceof Error) {
        expect(error.message).toBe('Student not found');
      } else {
        throw error;
      }
    }
  });
});
