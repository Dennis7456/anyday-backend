"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewResolvers = void 0;
exports.reviewResolvers = {
    Query: {
        // Fetch all reviews associated with the current user by orders
        reviews: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            const reviews = yield context.prisma.review.findMany({
                where: {
                    OR: [
                        { qaId: context.currentUser.id },
                        { writerId: context.currentUser.id },
                    ],
                },
                include: {
                    order: {
                        include: {
                            student: true, // Include student details if needed
                            uploadedFiles: true, // Include uploaded files if needed
                        },
                    },
                },
            });
            if (reviews.length === 0) {
                throw new Error('No reviews found for this user');
            }
            return reviews;
        }),
        // Fetch a single review associated with the current user by order ID
        review: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            const review = yield context.prisma.review.findFirst({
                where: {
                    id,
                    OR: [
                        { qaId: context.currentUser.id },
                        { writerId: context.currentUser.id },
                    ],
                },
                include: {
                    order: {
                        include: {
                            student: true, // Include student details if needed
                            uploadedFiles: true, // Include uploaded files if needed
                        },
                    },
                },
            });
            if (!review) {
                throw new Error('Review not found or you do not have permission to view it');
            }
            return review;
        }),
        // New resolver to get reviews by user
        reviewsByUser: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { userId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only allow admins or the user themselves to fetch reviews
            if (context.currentUser.role !== 'ADMIN' &&
                context.currentUser.id !== userId) {
                throw new Error('Unauthorized access to user reviews');
            }
            const reviews = yield context.prisma.review.findMany({
                where: {
                    OR: [{ qaId: userId }, { writerId: userId }],
                },
                include: { order: true },
            });
            if (reviews.length === 0) {
                throw new Error('No reviews found for this user');
            }
            return reviews;
        }),
    },
    Mutation: {
        createReview: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only QA can create reviews
            if (context.currentUser.role !== 'QA') {
                throw new Error('Only QA can create reviews');
            }
            const review = yield context.prisma.review.create({
                data: {
                    orderId: input.orderId,
                    qaId: input.qaId,
                    writerId: input.writerId,
                    comments: input.comments,
                    rating: input.rating,
                    status: 'PENDING',
                },
                include: { order: true },
            });
            return {
                success: true,
                message: 'Review created successfully.',
                review,
            };
        }),
        updateReview: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { reviewId, data, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the review to verify ownership
            const review = yield context.prisma.review.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                throw new Error('Review not found');
            }
            if (review.qaId !== context.currentUser.id &&
                review.writerId !== context.currentUser.id) {
                throw new Error('Unauthorized access to review');
            }
            // Proceed with the update
            const updatedReview = yield context.prisma.review.update({
                where: { id: reviewId },
                data,
            });
            return updatedReview;
        }),
        deleteReview: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { reviewId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the review to verify ownership
            const review = yield context.prisma.review.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                throw new Error('Review not found');
            }
            if (review.qaId !== context.currentUser.id) {
                throw new Error('Unauthorized access to review');
            }
            // Proceed with the deletion
            const deletedReview = yield context.prisma.review.delete({
                where: { id: reviewId },
            });
            return deletedReview;
        }),
    },
    Review: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
        qa: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.qaId },
            });
        },
        writer: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.writerId },
            });
        },
    },
};
