import { paymentResolvers } from '../src/controllers/paymentController';
import { GraphQLContext } from '../src/context/context';
import { PrismaClient, PaymentStatus, Role, Payment } from '@prisma/client';

// Mocking Prisma client methods
const mockPrisma = {
    payment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    order: {
        findUnique: jest.fn(),
    },
};

// Mock GraphQL context
const mockContext: GraphQLContext = {
    prisma: mockPrisma as unknown as PrismaClient,
    currentUser: {
        id: 'student-1',
        firstName: 'Bob',
        lastName: 'Johnson',
        userName: 'bobjohnson',
        email: 'bob.johnson@example.com',
        phoneNumber: '123-456-7890',
        dateOfBirth: new Date('1995-01-01'),
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
    },
};

describe('Payment Resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Query', () => {
        it('fetches all payments for the authenticated student', async () => {
            const mockPayments = [
                {
                    id: 'payment-1',
                    orderId: 'order-1',
                    amount: 100.0,
                    paymentStatus: PaymentStatus.COMPLETED,
                    transactionId: 'txn-1',
                    paymentDate: new Date(),
                    paymentMethod: 'Credit Card',
                    paymentDueDate: null,
                    order: {},
                },
            ];

            mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

            const result = await paymentResolvers.Query.payments(null, {}, mockContext);

            expect(result).toEqual(mockPayments);
            expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
                where: {
                    order: {
                        studentId: 'student-1',
                    },
                },
                include: { order: true },
            });
        });

        it('fetches a specific payment for the authenticated student', async () => {
            const mockPayment = {
                id: 'payment-1',
                orderId: 'order-1',
                amount: 100.0,
                paymentStatus: PaymentStatus.COMPLETED,
                transactionId: 'txn-1',
                paymentDate: new Date(),
                paymentMethod: 'Credit Card',
                paymentDueDate: null,
                order: {},
            };

            mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);

            const result = await paymentResolvers.Query.payment(
                null,
                { id: 'payment-1' },
                mockContext
            );

            expect(result).toEqual(mockPayment);
            expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'payment-1',
                    order: {
                        studentId: 'student-1',
                    },
                },
                include: { order: true },
            });
        });

        it('fetches payments by order', async () => {
            const mockPayments = [
                {
                    id: 'payment-1',
                    orderId: 'order-1',
                    amount: 100.0,
                    paymentStatus: PaymentStatus.COMPLETED,
                    transactionId: 'txn-1',
                    paymentDate: new Date(),
                    paymentMethod: 'Credit Card',
                    paymentDueDate: null,
                    order: {},
                },
            ];

            mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', studentId: 'student-1' });
            mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

            const result = await paymentResolvers.Query.paymentsByOrder(
                null,
                { orderId: 'order-1' },
                mockContext
            );

            expect(result).toEqual(mockPayments);
            expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
                where: { orderId: 'order-1' },
                include: { order: true },
            });
        });

        it('throws an error when fetching payments by order without ownership', async () => {
            mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', studentId: 'other-student' });

            await expect(
                paymentResolvers.Query.paymentsByOrder(
                    null,
                    { orderId: 'order-1' },
                    mockContext
                )
            ).rejects.toThrow('Unauthorized access to payments for this order');
        });

        it('fetches a payment by transaction ID', async () => {
            const mockPayment = {
                id: 'payment-1',
                orderId: 'order-1',
                amount: 100.0,
                paymentStatus: PaymentStatus.COMPLETED,
                transactionId: 'txn-1',
                paymentDate: new Date(),
                paymentMethod: 'Credit Card',
                paymentDueDate: null,
                order: {},
            };

            mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);

            const result = await paymentResolvers.Query.paymentByTransactionId(
                null,
                { transactionId: 'txn-1' },
                mockContext
            );

            expect(result).toEqual(mockPayment);
            expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
                where: {
                    transactionId: 'txn-1',
                    order: {
                        studentId: 'student-1',
                    },
                },
                include: { order: true },
            });
        });
    });

    describe('Mutation', () => {
        it('creates a payment when the user is the owner of the order', async () => {
            const createPaymentInput = {
                orderId: 'order-1',
                amount: 100.0,
                paymentMethod: 'Credit Card',
                transactionId: 'txn-1',
            };

            mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', studentId: 'student-1' });

            const mockPayment = {
                id: 'payment-1',
                ...createPaymentInput,
                paymentStatus: PaymentStatus.COMPLETED,
                paymentDate: new Date(),
                paymentDueDate: null,
                order: {},
            };

            mockPrisma.payment.create.mockResolvedValue(mockPayment);

            const result = await paymentResolvers.Mutation.createPayment(
                null,
                { input: createPaymentInput },
                mockContext
            );

            expect(result).toEqual({
                success: true,
                message: 'Payment processed successfully.',
                payment: mockPayment,
            });

            expect(mockPrisma.payment.create).toHaveBeenCalledWith({
                data: {
                    orderId: 'order-1',
                    amount: 100.0,
                    paymentStatus: PaymentStatus.COMPLETED,
                    paymentMethod: 'Credit Card',
                    transactionId: 'txn-1',
                },
                include: { order: true },
            });
        });

        it('throws an error when creating a payment for an order the user does not own', async () => {
            const createPaymentInput = {
                orderId: 'order-1',
                amount: 100.0,
                paymentMethod: 'Credit Card',
                transactionId: 'txn-1',
            };

            mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', studentId: 'other-student' });

            await expect(
                paymentResolvers.Mutation.createPayment(
                    null,
                    { input: createPaymentInput },
                    mockContext
                )
            ).rejects.toThrow('Unauthorized access to order');
        });

        it('updates a payment when the user is an admin', async () => {
            const adminContext: GraphQLContext = {
                ...mockContext,
                currentUser: {
                    id: 'admin-1',
                    firstName: 'Admin',
                    lastName: 'User',
                    userName: 'adminuser',
                    email: 'admin@example.com',
                    phoneNumber: '123-456-7890',
                    dateOfBirth: new Date('1980-01-01'),
                    password: 'hashedpassword',
                    role: Role.ADMIN,
                    isVerified: true,
                    profilePicture: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emailNotifications: true,
                    inAppNotifications: true,
                },
            };


            const paymentId = 'payment-1';
            const updateData = { paymentStatus: PaymentStatus.FAILED };

            const existingPayment = {
                id: paymentId,
                orderId: 'order-1',
                amount: 100.0,
                paymentStatus: PaymentStatus.COMPLETED,
                transactionId: 'txn-1',
            };

            const updatedPayment = { ...existingPayment, ...updateData };

            mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);
            mockPrisma.payment.update.mockResolvedValue(updatedPayment);

            const result = await paymentResolvers.Mutation.updatePayment(
                null,
                { paymentId, data: updateData },
                adminContext
            );

            expect(result).toEqual(updatedPayment);
            expect(mockPrisma.payment.update).toHaveBeenCalledWith({
                where: { id: paymentId },
                data: updateData,
            });
        });

        it('throws an error when a student tries to update a payment', async () => {
            const paymentId = 'payment-1';
            const updateData = { paymentStatus: PaymentStatus.FAILED };

            await expect(
                paymentResolvers.Mutation.updatePayment(
                    null,
                    { paymentId, data: updateData },
                    mockContext
                )
            ).rejects.toThrow('Only Admin can update payments');
        });

        it('deletes a payment when the user is an admin', async () => {
            const adminContext: GraphQLContext = {
                ...mockContext,
                currentUser: {
                    id: 'admin-1',
                    firstName: 'Admin',
                    lastName: 'User',
                    userName: 'adminuser',
                    email: 'admin@example.com',
                    phoneNumber: '123-456-7890',
                    dateOfBirth: new Date('1980-01-01'),
                    password: 'hashedpassword',
                    role: Role.ADMIN,
                    isVerified: true,
                    profilePicture: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emailNotifications: true,
                    inAppNotifications: true,
                },
            };


            const paymentId = 'payment-1';

            const existingPayment = {
                id: paymentId,
                orderId: 'order-1',
                amount: 100.0,
                paymentStatus: PaymentStatus.COMPLETED,
                transactionId: 'txn-1',
            };

            mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);
            mockPrisma.payment.delete.mockResolvedValue(existingPayment);

            const result = await paymentResolvers.Mutation.deletePayment(
                null,
                { paymentId },
                adminContext
            );

            expect(result).toEqual(existingPayment);
            expect(mockPrisma.payment.delete).toHaveBeenCalledWith({
                where: { id: paymentId },
            });
        });

        it('throws an error when a student tries to delete a payment', async () => {
            const paymentId = 'payment-1';

            await expect(
                paymentResolvers.Mutation.deletePayment(
                    null,
                    { paymentId },
                    mockContext
                )
            ).rejects.toThrow('Only Admin can delete payments');
        });
    });

    describe('Payment Type Resolvers', () => {
        it('resolves the order field', async () => {
            const parent: Payment = {
                id: 'payment-1',
                orderId: 'order-1',
                amount: 100.0,
                paymentStatus: PaymentStatus.COMPLETED,
                transactionId: 'txn-1',
                paymentDate: new Date(),
                paymentMethod: 'Credit Card',
                paymentDueDate: null,
            };

            const mockOrder = { id: 'order-1' };

            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

            const result = await paymentResolvers.Payment.order(
                parent,
                null,
                mockContext
            );

            expect(result).toEqual(mockOrder);
            expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
                where: { id: 'order-1' },
            });
        });
    });
});
