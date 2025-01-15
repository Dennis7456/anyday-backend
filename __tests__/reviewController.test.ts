import { reviewResolvers } from '../src/controllers/reviewController';
import { GraphQLContext } from '../src/context/context';
import { PrismaClient, Review, ReviewStatus, Role } from '@prisma/client';

// Mocking Prisma client methods
const mockPrisma = {
    review: {
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
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        userName: 'janedoe',
        email: 'jane.doe@example.com',
        phoneNumber: '123-456-7890',
        dateOfBirth: new Date('1990-01-01'),
        password: 'hashedpassword',
        role: Role.QA,
        isVerified: true,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailNotifications: true,
        inAppNotifications: true,
    },
};

describe('Review Resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Query', () => {
        it('fetches all reviews associated with the current user', async () => {
            const mockReviews = [
                {
                    id: 'review-1',
                    orderId: 'order-1',
                    qaId: 'user-1',
                    writerId: 'writer-1',
                    comments: 'Great work',
                    rating: 5,
                    status: ReviewStatus.PENDING,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    order: {},
                },
            ];

            mockPrisma.review.findMany.mockResolvedValue(mockReviews);

            const result = await reviewResolvers.Query.reviews(null, {}, mockContext);

            expect(result).toEqual(mockReviews);
            expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { qaId: mockContext.currentUser?.id },
                        { writerId: mockContext.currentUser?.id },
                    ],
                },
                include: {
                    order: {
                        include: {
                            student: true,
                            uploadedFiles: true,
                        },
                    },
                },
            });
        });

        it('fetches a single review associated with the current user', async () => {
            const mockReview = {
                id: 'review-1',
                orderId: 'order-1',
                qaId: 'user-1',
                writerId: 'writer-1',
                comments: 'Good job',
                rating: 4,
                status: ReviewStatus.VERIFIED,
                createdAt: new Date(),
                updatedAt: new Date(),
                order: {},
            };

            mockPrisma.review.findFirst.mockResolvedValue(mockReview);

            const result = await reviewResolvers.Query.review(
                null,
                { id: 'review-1' },
                mockContext
            );

            expect(result).toEqual(mockReview);
            expect(mockPrisma.review.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'review-1',
                    OR: [
                        { qaId: mockContext.currentUser?.id },
                        { writerId: mockContext.currentUser?.id },
                    ],
                },
                include: {
                    order: {
                        include: {
                            student: true,
                            uploadedFiles: true,
                        },
                    },
                },
            });
        });

        it('fetches reviews by user when requested by the user themselves', async () => {
            const mockReviews = [
                {
                    id: 'review-1',
                    orderId: 'order-1',
                    qaId: 'user-1',
                    writerId: 'writer-1',
                    comments: 'Excellent',
                    rating: 5,
                    status: ReviewStatus.VERIFIED,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    order: {},
                },
            ];

            mockPrisma.review.findMany.mockResolvedValue(mockReviews);

            const result = await reviewResolvers.Query.reviewsByUser(
                null,
                { userId: 'user-1' },
                mockContext
            );

            expect(result).toEqual(mockReviews);
            expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [{ qaId: 'user-1' }, { writerId: 'user-1' }],
                },
                include: { order: true },
            });
        });

        it('throws an error when fetching reviews by user without proper authorization', async () => {
            const otherUserContext: GraphQLContext = {
                ...mockContext,
                currentUser: {
                    id: 'other-user',
                    firstName: 'Other',
                    lastName: 'User',
                    userName: 'otheruser',
                    email: 'otheruser@example.com',
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

            await expect(
                reviewResolvers.Query.reviewsByUser(null, { userId: 'user-1' }, otherUserContext)
            ).rejects.toThrow('Unauthorized access to user reviews');
        });
    });

    describe('Mutation', () => {
        it('creates a review when the user is a QA', async () => {
            const createReviewInput = {
                orderId: 'order-1',
                qaId: 'user-1',
                writerId: 'writer-1',
                comments: 'Well done',
                rating: 5,
            };

            const mockReview = {
                id: 'review-1',
                ...createReviewInput,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
                order: {},
            };

            mockPrisma.review.create.mockResolvedValue(mockReview);

            const result = await reviewResolvers.Mutation.createReview(
                null,
                { input: createReviewInput },
                mockContext
            );

            expect(result).toEqual({
                success: true,
                message: 'Review created successfully.',
                review: mockReview,
            });

            expect(mockPrisma.review.create).toHaveBeenCalledWith({
                data: {
                    orderId: 'order-1',
                    qaId: 'user-1',
                    writerId: 'writer-1',
                    comments: 'Well done',
                    rating: 5,
                    status: ReviewStatus.PENDING,
                },
                include: { order: true },
            });
        });

        it('throws an error when a non-QA user tries to create a review', async () => {
            const studentContext: GraphQLContext = {
                ...mockContext,
                currentUser: {
                    id: 'student-1',
                    firstName: 'Student',
                    lastName: 'User',
                    userName: 'studentuser',
                    email: 'studentuser@example.com',
                    phoneNumber: '123-456-7890',
                    dateOfBirth: new Date('2000-01-01'),
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

            const createReviewInput = {
                orderId: 'order-1',
                qaId: 'user-1',
                writerId: 'writer-1',
                comments: 'Well done',
                rating: 5,
            };

            await expect(
                reviewResolvers.Mutation.createReview(
                    null,
                    { input: createReviewInput },
                    studentContext
                )
            ).rejects.toThrow('Only QA can create reviews');
        });

        it('updates a review when the user is the QA or writer', async () => {
            const reviewId = 'review-1';
            const updateData = { comments: 'Updated comment' };

            const existingReview = {
                id: reviewId,
                orderId: 'order-1',
                qaId: 'user-1',
                writerId: 'writer-1',
                comments: 'Original comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updatedReview = { ...existingReview, ...updateData };

            mockPrisma.review.findUnique.mockResolvedValue(existingReview);
            mockPrisma.review.update.mockResolvedValue(updatedReview);

            const result = await reviewResolvers.Mutation.updateReview(
                null,
                { reviewId, data: updateData },
                mockContext
            );

            expect(result).toEqual(updatedReview);
            expect(mockPrisma.review.update).toHaveBeenCalledWith({
                where: { id: reviewId },
                data: updateData,
            });
        });

        it('throws an error when updating a review without authorization', async () => {
            const reviewId = 'review-1';
            const updateData = { comments: 'Updated comment' };

            const existingReview = {
                id: reviewId,
                orderId: 'order-1',
                qaId: 'other-qa',
                writerId: 'other-writer',
                comments: 'Original comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.review.findUnique.mockResolvedValue(existingReview);

            await expect(
                reviewResolvers.Mutation.updateReview(
                    null,
                    { reviewId, data: updateData },
                    mockContext
                )
            ).rejects.toThrow('Unauthorized access to review');
        });

        it('deletes a review when the user is the QA', async () => {
            const reviewId = 'review-1';

            const existingReview = {
                id: reviewId,
                orderId: 'order-1',
                qaId: 'user-1',
                writerId: 'writer-1',
                comments: 'Some comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.review.findUnique.mockResolvedValue(existingReview);
            mockPrisma.review.delete.mockResolvedValue(existingReview);

            const result = await reviewResolvers.Mutation.deleteReview(
                null,
                { reviewId },
                mockContext
            );

            expect(result).toEqual(existingReview);
            expect(mockPrisma.review.delete).toHaveBeenCalledWith({
                where: { id: reviewId },
            });
        });

        it('throws an error when deleting a review without authorization', async () => {
            const reviewId = 'review-1';

            const existingReview = {
                id: reviewId,
                orderId: 'order-1',
                qaId: 'other-qa',
                writerId: 'writer-1',
                comments: 'Some comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.review.findUnique.mockResolvedValue(existingReview);

            await expect(
                reviewResolvers.Mutation.deleteReview(
                    null,
                    { reviewId },
                    mockContext
                )
            ).rejects.toThrow('Unauthorized access to review');
        });
    });

    describe('Review Type Resolvers', () => {
        it('resolves the order field', async () => {
            const parent: Review = {
                id: 'review-1',
                orderId: 'order-1',
                qaId: 'qa-1',
                writerId: 'writer-1',
                comments: 'Some comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockOrder = { id: 'order-1' };

            mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

            const result = await reviewResolvers.Review.order(parent, null, mockContext);

            expect(result).toEqual(mockOrder);
            expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
                where: { id: 'order-1' },
            });
        });

        it('resolves the qa field', async () => {
            const parent: Review = {
                id: 'review-1',
                orderId: 'order-1',
                qaId: 'qa-1',
                writerId: 'writer-1',
                comments: 'Some comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUser = { id: 'qa-1' };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await reviewResolvers.Review.qa(parent, null, mockContext);

            expect(result).toEqual(mockUser);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'qa-1' },
            });
        });

        it('resolves the writer field', async () => {
            const parent: Review = {
                id: 'review-1',
                orderId: 'order-1',
                qaId: 'qa-1',
                writerId: 'writer-1',
                comments: 'Some comment',
                rating: 4,
                status: ReviewStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUser = { id: 'writer-1' };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await reviewResolvers.Review.writer(parent, null, mockContext);

            expect(result).toEqual(mockUser);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'writer-1' },
            });
        });
    });
});
