import { GraphQLContext } from '../context/context'
import { PaymentStatus } from '@prisma/client'

interface Payment {
  id: string
  orderId: string
  amount: number
  paymentStatus: PaymentStatus
  transactionId: string | null
  paymentDate: Date
  paymentMethod: string | null
  paymentDueDate: Date | null
}

export const paymentResolvers = {
  Query: {
    payments: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const payments = await context.prisma.payment.findMany({
        where: {
          order: {
            studentId: context.currentUser.id,
          },
        },
        include: { order: true },
      })

      if (payments.length === 0) {
        throw new Error('No payments found for this user')
      }

      return payments
    },

    payment: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const payment = await context.prisma.payment.findFirst({
        where: {
          id,
          order: {
            studentId: context.currentUser.id,
          },
        },
        include: { order: true },
      })

      if (!payment) {
        throw new Error(
          'Payment not found or you do not have permission to view it'
        )
      }

      return payment
    },

    // Get payments by order
    paymentsByOrder: async (
      _: unknown,
      { orderId }: { orderId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the order to verify ownership
      const order = await context.prisma.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.studentId !== context.currentUser.id) {
        throw new Error('Unauthorized access to payments for this order')
      }

      const payments = await context.prisma.payment.findMany({
        where: { orderId },
        include: { order: true },
      })

      if (payments.length === 0) {
        throw new Error('No payments found for this order')
      }

      return payments
    },

    // Get payment by transaction ID
    paymentByTransactionId: async (
      _: unknown,
      { transactionId }: { transactionId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const payment = await context.prisma.payment.findFirst({
        where: {
          transactionId,
          order: {
            studentId: context.currentUser.id,
          },
        },
        include: { order: true },
      })

      if (!payment) {
        throw new Error(
          'Payment not found or you do not have permission to view it'
        )
      }

      return payment
    },
  },
  Mutation: {
    createPayment: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          orderId: string
          amount: number
          paymentMethod?: string
          transactionId?: string
        }
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the order to verify ownership
      const order = await context.prisma.order.findUnique({
        where: { id: input.orderId },
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.studentId !== context.currentUser.id) {
        throw new Error('Unauthorized access to order')
      }

      const payment = await context.prisma.payment.create({
        data: {
          orderId: input.orderId,
          amount: input.amount,
          paymentStatus: 'COMPLETED',
          paymentMethod: input.paymentMethod,
          transactionId: input.transactionId,
        },
        include: { order: true },
      })

      return {
        success: true,
        message: 'Payment processed successfully.',
        payment,
      }
    },

    updatePayment: async (
      _: unknown,
      {
        paymentId,
        data,
      }: {
        paymentId: string
        data: Partial<Payment>
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only Admin can update payments
      if (context.currentUser.role !== 'ADMIN') {
        throw new Error('Only Admin can update payments')
      }

      // Fetch the payment
      const payment = await context.prisma.payment.findUnique({
        where: { id: paymentId },
      })

      if (!payment) {
        throw new Error('Payment not found')
      }

      // Proceed with the update
      const updatedPayment = await context.prisma.payment.update({
        where: { id: paymentId },
        data,
      })

      return updatedPayment
    },

    deletePayment: async (
      _: unknown,
      { paymentId }: { paymentId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only Admin can delete payments
      if (context.currentUser.role !== 'ADMIN') {
        throw new Error('Only Admin can delete payments')
      }

      // Fetch the payment
      const payment = await context.prisma.payment.findUnique({
        where: { id: paymentId },
      })

      if (!payment) {
        throw new Error('Payment not found')
      }

      // Proceed with the deletion
      const deletedPayment = await context.prisma.payment.delete({
        where: { id: paymentId },
      })

      return deletedPayment
    },
  },
  Payment: {
    order: (parent: Payment, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      })
    },
  },
}
