import { GraphQLContext } from '../context/context'
import { ReviewStatus } from '@prisma/client'

interface Review {
  id: string
  orderId: string
  qaId: string
  writerId: string
  comments: string | null
  rating: number
  status: ReviewStatus
  createdAt: Date
  updatedAt: Date
}

export const reviewResolvers = {
  Query: {
    // Fetch all reviews associated with the current user by orders
    reviews: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Please login to continue')
      }

      const reviews = await context.prisma.review.findMany({
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
      })

      if (reviews.length === 0) {
        throw new Error('No reviews found for this user')
      }

      return reviews
    },

    // Fetch a single review associated with the current user by order ID
    review: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Please login to continue')
      }

      const review = await context.prisma.review.findFirst({
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
      })

      if (!review) {
        throw new Error(
          'Review not found or you do not have permission to view it'
        )
      }

      return review
    },

    // New resolver to get reviews by user
    reviewsByUser: async (
      _: unknown,
      { userId }: { userId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only allow admins or the user themselves to fetch reviews
      if (
        context.currentUser.role !== 'ADMIN' &&
        context.currentUser.id !== userId
      ) {
        throw new Error('Unauthorized access to user reviews')
      }

      const reviews = await context.prisma.review.findMany({
        where: {
          OR: [{ qaId: userId }, { writerId: userId }],
        },
        include: { order: true },
      })

      if (reviews.length === 0) {
        throw new Error('No reviews found for this user')
      }

      return reviews
    },
  },

  Mutation: {
    createReview: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          orderId: string
          qaId: string
          writerId: string
          comments?: string
          rating: number
        }
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only QA can create reviews
      if (context.currentUser.role !== 'QA') {
        throw new Error('Only QA can create reviews')
      }

      const review = await context.prisma.review.create({
        data: {
          orderId: input.orderId,
          qaId: input.qaId,
          writerId: input.writerId,
          comments: input.comments,
          rating: input.rating,
          status: 'PENDING',
        },
        include: { order: true },
      })

      return {
        success: true,
        message: 'Review created successfully.',
        review,
      }
    },

    updateReview: async (
      _: unknown,
      {
        reviewId,
        data,
      }: {
        reviewId: string
        data: Partial<Review>
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the review to verify ownership
      const review = await context.prisma.review.findUnique({
        where: { id: reviewId },
      })

      if (!review) {
        throw new Error('Review not found')
      }

      if (
        review.qaId !== context.currentUser.id &&
        review.writerId !== context.currentUser.id
      ) {
        throw new Error('Unauthorized access to review')
      }

      // Proceed with the update
      const updatedReview = await context.prisma.review.update({
        where: { id: reviewId },
        data,
      })

      return updatedReview
    },

    deleteReview: async (
      _: unknown,
      { reviewId }: { reviewId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the review to verify ownership
      const review = await context.prisma.review.findUnique({
        where: { id: reviewId },
      })

      if (!review) {
        throw new Error('Review not found')
      }

      if (review.qaId !== context.currentUser.id) {
        throw new Error('Unauthorized access to review')
      }

      // Proceed with the deletion
      const deletedReview = await context.prisma.review.delete({
        where: { id: reviewId },
      })

      return deletedReview
    },
  },
  Review: {
    order: (parent: Review, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      })
    },
    qa: (parent: Review, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.qaId },
      })
    },
    writer: (parent: Review, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.writerId },
      })
    },
  },
}
