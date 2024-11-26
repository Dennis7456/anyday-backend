import { assignmentResolvers } from '../src/controllers/assignmentController';
import { GraphQLContext } from '../src/context/context';
import { PrismaClient, AssignmentStatus, Role, Assignment } from '@prisma/client';

// Mocking Prisma client methods
const mockPrisma = {
    assignment: {
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
    user: {
        findUnique: jest.fn(),
    },
};

// Mock GraphQL context
const mockContext: GraphQLContext = {
    prisma: mockPrisma as unknown as PrismaClient,
    currentUser: {
        id: 'writer-1',
        firstName: 'Alice',
        lastName: 'Smith',
        userName: 'alicesmith',
        email: 'alice.smith@example.com',
        phoneNumber: '123-456-7890',
        dateOfBirth: new Date('1985-01-01'),
        password: 'hashedpassword',
        role: Role.WRITER,
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
    },
};

describe('Assignment Resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Query', () => {
        it('fetches all assignments for the authenticated writer', async () => {
            const mockAssignments = [
                {
                    id: 'assignment-1',
                    orderId: 'order-1',
                    writerId: 'writer-1',
                    assignedAt: new Date(),
                    completedAt: null,
                    status: AssignmentStatus.PENDING,
                    order: {},
                },
            ];

            mockPrisma.assignment.findMany.mockResolvedValue(mockAssignments);

            const result = await assignmentResolvers.Query.assignments(null, {}, mockContext);

            expect(result).toEqual(mockAssignments);
            expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
                where: { writerId: 'writer-1' },
                include: { order: true },
            });
        });

        it('fetches a specific assignment for the authenticated writer', async () => {
            const mockAssignment = {
                id: 'assignment-1',
                orderId: 'order-1',
                writerId: 'writer-1',
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.PENDING,
                order: {},
            };

            mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment);

            const result = await assignmentResolvers.Query.assignment(
                null,
                { id: 'assignment-1' },
                mockContext
            );

            expect(result).toEqual(mockAssignment);
            expect(mockPrisma.assignment.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'assignment-1',
                    writerId: 'writer-1',
                },
                include: { order: true },
            });
        });

        it('fetches assignments by order for an admin', async () => {
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

            const mockAssignments = [
                {
                    id: 'assignment-1',
                    orderId: 'order-1',
                    writerId: 'writer-1',
                    assignedAt: new Date(),
                    completedAt: null,
                    status: AssignmentStatus.PENDING,
                    order: {},
                    writer: {},
                },
            ];

            mockPrisma.assignment.findMany.mockResolvedValue(mockAssignments);

            const result = await assignmentResolvers.Query.assignmentsByOrder(
                null,
                { orderId: 'order-1' },
                adminContext
            );

            expect(result).toEqual(mockAssignments);
            expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
                where: { orderId: 'order-1' },
                include: { order: true, writer: true },
            });
        });

        it('throws an error when a writer tries to fetch assignments by order', async () => {
            await expect(
                assignmentResolvers.Query.assignmentsByOrder(
                    null,
                    { orderId: 'order-1' },
                    mockContext
                )
            ).rejects.toThrow('Only Admin or QA can access assignments by order');
        });

        it('fetches assignments by writer when requested by the writer', async () => {
            const mockAssignments = [
                {
                    id: 'assignment-1',
                    orderId: 'order-1',
                    writerId: 'writer-1',
                    assignedAt: new Date(),
                    completedAt: null,
                    status: AssignmentStatus.PENDING,
                    order: {},
                    writer: {},
                },
            ];

            mockPrisma.assignment.findMany.mockResolvedValue(mockAssignments);

            const result = await assignmentResolvers.Query.assignmentsByWriter(
                null,
                { writerId: 'writer-1' },
                mockContext
            );

            expect(result).toEqual(mockAssignments);
            expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
                where: { writerId: 'writer-1' },
                include: { order: true, writer: true },
            });
        });

        it('throws an error when a writer tries to fetch assignments of another writer', async () => {
            await expect(
                assignmentResolvers.Query.assignmentsByWriter(
                    null,
                    { writerId: 'other-writer' },
                    mockContext
                )
            ).rejects.toThrow('Unauthorized access to writer assignments');
        });
    });

    describe('Mutation', () => {
        it('creates an assignment when the user is an admin', async () => {
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

            const createAssignmentInput = {
                orderId: 'order-1',
                writerId: 'writer-1',
            };

            const mockAssignment = {
                id: 'assignment-1',
                ...createAssignmentInput,
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.PENDING,
                order: {},
            };

            mockPrisma.assignment.create.mockResolvedValue(mockAssignment);

            const result = await assignmentResolvers.Mutation.createAssignment(
                null,
                { input: createAssignmentInput },
                adminContext
            );

            expect(result).toEqual({
                success: true,
                message: 'Assignment created successfully.',
                assignment: mockAssignment,
            });

            expect(mockPrisma.assignment.create).toHaveBeenCalledWith({
                data: {
                    orderId: 'order-1',
                    writerId: 'writer-1',
                    status: AssignmentStatus.PENDING,
                },
                include: { order: true },
            });
        });

        it('throws an error when a writer tries to create an assignment', async () => {
            const createAssignmentInput = {
                orderId: 'order-1',
                writerId: 'writer-1',
            };

            await expect(
                assignmentResolvers.Mutation.createAssignment(
                    null,
                    { input: createAssignmentInput },
                    mockContext
                )
            ).rejects.toThrow('Only Admin or QA can create assignments');
        });

        it('updates an assignment when the writer is authorized', async () => {
            const assignmentId = 'assignment-1';
            const updateData = { status: AssignmentStatus.COMPLETED };

            const existingAssignment = {
                id: assignmentId,
                orderId: 'order-1',
                writerId: 'writer-1',
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.IN_PROGRESS,
            };

            const updatedAssignment = { ...existingAssignment, ...updateData };

            mockPrisma.assignment.findUnique.mockResolvedValue(existingAssignment);
            mockPrisma.assignment.update.mockResolvedValue(updatedAssignment);

            const result = await assignmentResolvers.Mutation.updateAssignment(
                null,
                { assignmentId, data: updateData },
                mockContext
            );

            expect(result).toEqual(updatedAssignment);
            expect(mockPrisma.assignment.update).toHaveBeenCalledWith({
                where: { id: assignmentId },
                data: updateData,
            });
        });

        it('throws an error when updating an assignment without authorization', async () => {
            const assignmentId = 'assignment-1';
            const updateData = { status: AssignmentStatus.COMPLETED };

            const existingAssignment = {
                id: assignmentId,
                orderId: 'order-1',
                writerId: 'other-writer',
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.IN_PROGRESS,
            };

            mockPrisma.assignment.findUnique.mockResolvedValue(existingAssignment);

            await expect(
                assignmentResolvers.Mutation.updateAssignment(
                    null,
                    { assignmentId, data: updateData },
                    mockContext
                )
            ).rejects.toThrow('Unauthorized access to assignment');
        });

        it('deletes an assignment when the user is an admin', async () => {
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

            const assignmentId = 'assignment-1';

            const existingAssignment = {
                id: assignmentId,
                orderId: 'order-1',
                writerId: 'writer-1',
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.IN_PROGRESS,
            };

            mockPrisma.assignment.findUnique.mockResolvedValue(existingAssignment);
            mockPrisma.assignment.delete.mockResolvedValue(existingAssignment);

            const result = await assignmentResolvers.Mutation.deleteAssignment(
                null,
                { assignmentId },
                adminContext
            );

            expect(result).toEqual(existingAssignment);
            expect(mockPrisma.assignment.delete).toHaveBeenCalledWith({
                where: { id: assignmentId },
            });
        });

        it('throws an error when a writer tries to delete an assignment', async () => {
            const assignmentId = 'assignment-1';

            await expect(
                assignmentResolvers.Mutation.deleteAssignment(
                    null,
                    { assignmentId },
                    mockContext
                )
            ).rejects.toThrow('Only Admin or QA can delete assignments');
        });
    });

    describe('Assignment Type Resolvers', () => {
        it('resolves the order field', async () => {
            const parent: Assignment = {
                id: 'assignment-1',
                orderId: 'order-1',
                writerId: 'writer-1',
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.PENDING,
            };
            const mockOrder = { id: 'order-1' };

            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

            const result = await assignmentResolvers.Assignment.order(
                parent,
                null,
                mockContext
            );

            expect(result).toEqual(mockOrder);
            expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
                where: { id: 'order-1' },
            });
        });

        it('resolves the writer field', async () => {
            const parent: Assignment = {
                id: 'assignment-1',
                orderId: 'order-1',
                writerId: 'writer-1',
                assignedAt: new Date(),
                completedAt: null,
                status: AssignmentStatus.PENDING,
            };
            const mockUser = { id: 'writer-1' };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await assignmentResolvers.Assignment.writer(
                parent,
                null,
                mockContext
            );

            expect(result).toEqual(mockUser);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'writer-1' },
            });
        });
    });
});
