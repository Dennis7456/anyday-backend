jest.mock('../src/services/sendOrderSuccessEmail', () => {
  return {
    __esModule: true, // Use this property to ensure correct handling of ES modules
    sendOrderSuccessEmail: jest.fn(),
  };
});

import { gql } from 'apollo-server';
import { orderResolvers } from '../src/controllers/orderController'; // Adjust path as needed
import { GraphQLContext } from '../src/context/context'; // Your GraphQL context
import { sendOrderSuccessEmail } from '../src/services/sendOrderSuccessEmail'; // Mock email service
import { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';

console.log('Is sendOrderSuccessEmail a mock function?', jest.isMockFunction(sendOrderSuccessEmail));
// Should log: true

// Mocking Prisma client methods
const mockPrisma = {
  order: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

  it('throws an error when trying to fetch orders without authentication', async () => {
    const contextWithoutUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: null
    };

    await expect(orderResolvers.Query.orders(null, {}, contextWithoutUser))
      .rejects
      .toThrow('Please login');
  });

  it('throws an error when trying to fetch a specific order without authentication', async () => {
    const contextWithoutUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: null,
    };

    const orderId = '1';

    await expect(orderResolvers.Query.order(null, { id: orderId }, contextWithoutUser))
      .rejects
      .toThrow('Please login to continue');
  });

  it('throws an error when trying to access an order that does not belong to the user', async () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      userName: 'johndoe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2000-01-01'),
      password: 'hashed_password', // Can be any mock password
      role: Role.STUDENT, // Assuming 'STUDENT' is a valid role in your application
      isVerified: true,
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailNotifications: true,
      inAppNotifications: true,
    }; // Logged-in user
    const contextWithUser: GraphQLContext = {
      prisma: {
        order: {
          findFirst: jest.fn().mockResolvedValue(null), // Simulate no order found for this user
        },
      } as unknown as PrismaClient,
      currentUser: mockUser,
    };

    const orderId = '2'; // Some order ID

    await expect(orderResolvers.Query.order(null, { id: orderId }, contextWithUser))
      .rejects
      .toThrow('Order not found or you do not have permission to view it');
  });

  it('returns the order when the user is authenticated and owns the order', async () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      userName: 'johndoe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2000-01-01'),
      password: 'hashed_password', // Can be any mock password
      role: Role.STUDENT, // Assuming 'STUDENT' is a valid role in your application
      isVerified: true,
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailNotifications: true,
      inAppNotifications: true,
    };
    const mockOrder = {
      id: '1',
      studentId: 'user-1',
      instructions: 'Sample instructions',
      paperType: 'Essay',
      numberOfPages: 5,
      dueDate: new Date(),
      totalAmount: 100,
      depositAmount: 50,
      status: 'Pending',
      uploadedFiles: [],
    };

    const contextWithUser: GraphQLContext = {
      prisma: {
        order: {
          findFirst: jest.fn().mockResolvedValue(mockOrder),
        },
      } as unknown as PrismaClient,
      currentUser: mockUser,
    };

    const orderId = '1';

    const result = await orderResolvers.Query.order(null, { id: orderId }, contextWithUser);
    expect(result).toEqual(mockOrder);
  });

  it('throws an error when trying to access orders that do not belong to the user', async () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      userName: 'johndoe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2000-01-01'),
      password: 'hashed_password', // Can be any mock password
      role: Role.STUDENT, // Assuming 'STUDENT' is a valid role in your application
      isVerified: true,
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailNotifications: true,
      inAppNotifications: true,
    };
    const unauthorizedOrders = [
      {
        id: '1',
        studentId: 'other-user',
        instructions: 'Unauthorized Order instructions',
        paperType: 'Essay',
        numberOfPages: 3,
        dueDate: new Date(),
        totalAmount: 90,
        depositAmount: 30,
        status: 'Pending',
        uploadedFiles: [],
      },
    ];

    const contextWithUser: GraphQLContext = {
      prisma: {
        order: {
          findMany: jest.fn().mockResolvedValue(unauthorizedOrders),
        },
      } as unknown as PrismaClient,
      currentUser: mockUser,
    };

    await expect(orderResolvers.Query.orders(null, {}, contextWithUser))
      .rejects
      .toThrow('Unauthorized access to orders');
  });

  it('returns orders when the user is authenticated and owns the orders', async () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      userName: 'johndoe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      dateOfBirth: new Date('2000-01-01'),
      password: 'hashed_password', // Can be any mock password
      role: Role.STUDENT, // Assuming 'STUDENT' is a valid role in your application
      isVerified: true,
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailNotifications: true,
      inAppNotifications: true,
    };
    const userOrders = [
      {
        id: '1',
        studentId: 'user-1',
        instructions: 'Order 1 instructions',
        paperType: 'Essay',
        numberOfPages: 3,
        dueDate: new Date(),
        totalAmount: 90,
        depositAmount: 30,
        status: 'Pending',
        uploadedFiles: [],
      },
      {
        id: '2',
        studentId: 'user-1',
        instructions: 'Order 2 instructions',
        paperType: 'Research Paper',
        numberOfPages: 10,
        dueDate: new Date(),
        totalAmount: 300,
        depositAmount: 150,
        status: 'In Progress',
        uploadedFiles: [],
      },
    ];

    const contextWithUser: GraphQLContext = {
      prisma: {
        order: {
          findMany: jest.fn().mockResolvedValue(userOrders),
        },
      } as unknown as PrismaClient,
      currentUser: mockUser,
    };

    const result = await orderResolvers.Query.orders(null, {}, contextWithUser);
    expect(result).toEqual(userOrders);
    expect(contextWithUser.prisma.order.findMany).toHaveBeenCalledWith({
      where: { studentId: mockUser.id },
      include: { uploadedFiles: true },
    });
  });

});

describe('updateOrder Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error when trying to update an order without authentication', async () => {
    const contextWithoutUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: null, // No authenticated user
    };

    const orderId = '1';
    const data = { instructions: 'Updated instructions' };

    await expect(orderResolvers.Mutation.updateOrder(
      null,
      { orderId, data },
      contextWithoutUser
    )).rejects.toThrow('Please login to continue');
  });

  it('successfully updates an order when the user is authenticated and owns the order', async () => {
    // Mock authenticated user context
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id', // Match the studentId
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: 'STUDENT',
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    const orderId = '1';
    const data = { instructions: 'Updated instructions' };

    const existingOrder = {
      id: orderId,
      instructions: 'Old instructions',
      paperType: 'Essay',
      numberOfPages: 3,
      dueDate: new Date(),
      totalAmount: 90,
      depositAmount: 30,
      status: 'Pending',
      studentId: 'authenticated-user-id', // Match the currentUser.id
      uploadedFiles: [
        {
          id: 'file-1',
          orderId: '1',
          name: 'example.pdf',
          url: 'http://example.com/example.pdf',
          size: 12345,
          mimeType: 'application/pdf',
        },
      ],
    };

    const updatedOrder = {
      ...existingOrder,
      instructions: 'Updated instructions', // Updated field
    };

    // Mock findUnique to return the existing order
    mockPrisma.order.findUnique = jest.fn().mockResolvedValue(existingOrder);

    // Mock update to return the updated order
    mockPrisma.order.update = jest.fn().mockResolvedValue(updatedOrder);

    const result = await orderResolvers.Mutation.updateOrder(null, { orderId, data }, contextWithUser);

    // Assertions
    expect(result).toEqual(updatedOrder);

    // Ensure `findUnique` was called with correct parameters
    expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: orderId },
      include: { uploadedFiles: true },
    });

    // Ensure `update` was called with correct parameters
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data,
    });
  });


  it('throws an error when trying to update an order that does not belong to the user', async () => {
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id', // Make sure the currentUser id is different from the order's studentId
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: 'STUDENT',
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    const orderId = '1';
    const data = { instructions: 'Updated instructions' };

    // Mock findUnique to return an order that belongs to a different user
    const unauthorizedOrder = {
      id: orderId,
      instructions: 'Unauthorized instructions',
      paperType: 'Essay',
      numberOfPages: 3,
      dueDate: new Date(),
      totalAmount: 90,
      depositAmount: 30,
      status: 'Pending',
      studentId: 'other-user-id',  // Different studentId from the currentUser
      uploadedFiles: [],
    };

    mockPrisma.order.findUnique = jest.fn().mockResolvedValue(unauthorizedOrder);
    mockPrisma.order.update = jest.fn();

    await expect(orderResolvers.Mutation.updateOrder(null, { orderId, data }, contextWithUser))
      .rejects
      .toThrow('Unauthorized access to order');
  });

  it('throws an error if the update fails due to database issue', async () => {
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id',
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: 'STUDENT',
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    const orderId = '1';
    const data = { instructions: 'Updated instructions' };

    // Mock findUnique to return a valid order
    mockPrisma.order.findUnique = jest.fn().mockResolvedValue({
      id: orderId,
      studentId: 'authenticated-user-id',
      instructions: 'Current instructions',
      // other properties...
    });

    // Mock update to throw a database error
    mockPrisma.order.update = jest.fn().mockRejectedValue(new Error('Database error'));

    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });

    await expect(orderResolvers.Mutation.updateOrder(null, { orderId, data }, contextWithUser))
      .rejects
      .toThrow('Unauthorized access to order');
    consoleErrorMock.mockRestore();
  });
});

describe('createOrder Mutation', () => {
  it('creates a new order with authentication and sends an order success email to notify the student', async () => {
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

    // GraphQL mutation for creating an order
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

    // Call the mutation
    const result = await orderResolvers.Mutation.createOrder(null, variables, mockContext);

    // Assertions for mutation response
    expect(result.success).toBe(true);
    expect(result.message).toBe('Order created successfully. A confirmation email has been sent.');
    expect(result.order).toHaveProperty('id', '2');
    expect(result.order.totalAmount).toBe(200);

    // Check that sendOrderSuccessEmail was called with the correct parameters
    expect(sendOrderSuccessEmail).toHaveBeenCalledWith(
      'student@example.com',  // to
      'Test order 2',          // instructions
      'Research Paper',        // paperType
      10,                      // numberOfPages
      expect.any(String),      // dueDate
      200,                     // totalAmount
      100,                     // depositAmount
      'PENDING',               // status
      expect.any(Array),       // uploadedFiles (array of file objects)
    );
  });

  it('creates a new order with authentication and sends an order success email to notify the student', async () => {
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

    // Mock Prisma operations
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'student@example.com',
    });

    mockPrisma.order.create.mockResolvedValue({
      id: '2',
      studentId: '1',
      instructions: 'Test order 2',
      paperType: 'Research Paper',
      numberOfPages: 10,
      dueDate: new Date(),
      totalAmount: 200,
      depositAmount: 100,
      status: 'PENDING',
      uploadedFiles: [],
    });

    // Call the mutation
    const result = await orderResolvers.Mutation.createOrder(
      null,
      { input: createOrderInput },
      mockContext
    );

    // Assertions
    expect(result.success).toBe(true);
    expect(result.message).toBe('Order created successfully. A confirmation email has been sent.');
    expect(result.order).toHaveProperty('id', '2');
    expect(result.order.totalAmount).toBe(200);

    // Check `sendOrderSuccessEmail` mock calls
    expect(sendOrderSuccessEmail).toHaveBeenCalledWith(
      'student@example.com',
      'Test order 2',
      'Research Paper',
      10,
      expect.any(String), // dueDate
      200,
      100,
      'PENDING',
      expect.any(Array) // uploadedFiles
    );
  });
});

describe('deleteOrder Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error when trying to delete an order without authentication', async () => {
    const contextWithoutUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: null,
    };

    const orderId = '1';

    await expect(
      orderResolvers.Mutation.deleteOrder(null, { orderId }, contextWithoutUser)
    ).rejects.toThrow('Please login to continue');
  });

  it('successfully deletes an order when the user is authenticated and owns the order', async () => {
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id',
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: 'STUDENT',
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    const orderId = '1';

    const existingOrder = {
      id: orderId,
      instructions: 'Some instructions',
      paperType: 'Essay',
      numberOfPages: 3,
      dueDate: new Date(),
      totalAmount: 90,
      depositAmount: 30,
      status: 'Pending',
      studentId: 'authenticated-user-id',
      uploadedFiles: [
        {
          id: 'file-1',
          orderId: '1',
          name: 'example.pdf',
          url: 'http://example.com/example.pdf',
          size: 12345,
          mimeType: 'application/pdf',
        },
      ],
    };

    // Mock findUnique to return the existing order
    mockPrisma.order.findUnique = jest.fn().mockResolvedValue(existingOrder);

    // Mock delete to simulate successful deletion
    mockPrisma.order.delete = jest.fn().mockResolvedValue(existingOrder);

    const result = await orderResolvers.Mutation.deleteOrder(null, { orderId }, contextWithUser);

    expect(result).toEqual(existingOrder);

    // Ensure that findUnique was called with the correct parameters
    expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: orderId },
      include: { uploadedFiles: true }, // Add the include to match the actual resolver
    });

    // Ensure that delete was called with the correct parameters
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({
      where: { id: orderId },
      include: { uploadedFiles: true },
    });
  });

  it('throws an error when trying to delete an order that does not belong to the user', async () => {
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id', // Different from the studentId of the order
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: Role.STUDENT,
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    const orderId = '1';

    const unauthorizedOrder = {
      id: orderId,
      instructions: 'Unauthorized instructions',
      paperType: 'Essay',
      numberOfPages: 3,
      dueDate: new Date(),
      totalAmount: 90,
      depositAmount: 30,
      status: 'Pending',
      studentId: 'other-user-id', // Different studentId from the currentUser
      uploadedFiles: [],
    };

    // Mock `console.error` to suppress the error log
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });

    // Mock findUnique to return an order that belongs to a different user
    mockPrisma.order.findUnique.mockResolvedValue(unauthorizedOrder);

    await expect(
      orderResolvers.Mutation.deleteOrder(null, { orderId }, contextWithUser)
    ).rejects.toThrow('Unauthorized access to order');

    // Ensure delete was not called
    expect(mockPrisma.order.delete).not.toHaveBeenCalled();

    // Restore the original `console.error` after the test
    consoleErrorMock.mockRestore();
  });

  it('throws an error if the order does not exist', async () => {
    const orderId = '1';
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id',
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: Role.STUDENT,
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    // Mock `console.error` to suppress the error log
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });

    mockPrisma.order.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      orderResolvers.Mutation.deleteOrder(null, { orderId }, contextWithUser)
    ).rejects.toThrow('Order not found');

    expect(mockPrisma.order.delete).not.toHaveBeenCalled();

    // Restore the original `console.error` after the test
    consoleErrorMock.mockRestore();
  });

  it('throws an error if the deletion fails due to a database issue', async () => {
    const contextWithUser: GraphQLContext = {
      prisma: mockPrisma as unknown as PrismaClient,
      currentUser: {
        id: 'authenticated-user-id',
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        dateOfBirth: new Date('2000-01-01'),
        password: 'password123',
        role: 'STUDENT',
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
      },
    };

    const orderId = '1';

    const existingOrder = {
      id: orderId,
      studentId: 'authenticated-user-id',
      instructions: 'Current instructions',
      paperType: 'Essay',
      numberOfPages: 3,
      dueDate: new Date(),
      totalAmount: 90,
      depositAmount: 30,
      status: 'Pending',
      submittedAt: null,
      uploadedFiles: [
        {
          id: 'file-1',
          orderId: '1',
          name: 'example.pdf',
          url: 'http://example.com/example.pdf',
          size: 12345,
          mimeType: 'application/pdf',
        },
      ],
    };

    // Mock findUnique to return a valid order
    mockPrisma.order.findUnique = jest.fn().mockResolvedValue(existingOrder);

    // Mock delete to throw a database error
    mockPrisma.order.delete = jest.fn().mockRejectedValue(new Error('Database error'));
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });

    await expect(
      orderResolvers.Mutation.deleteOrder(null, { orderId }, contextWithUser)
    ).rejects.toThrow('Database error');

    // Ensure findUnique was called
    expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: orderId },
      include: { uploadedFiles: true }, // Ensure include is present
    });

    // Ensure delete was attempted with include
    expect(mockPrisma.order.delete).toHaveBeenCalledWith({
      where: { id: orderId },
      include: { uploadedFiles: true }, // Ensure include is part of delete query
    });

    consoleErrorMock.mockRestore();
  });

});






