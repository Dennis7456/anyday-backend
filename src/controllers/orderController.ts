// orderController.ts
import { GraphQLContext } from '../context/context'
import { sendOrderSuccessEmail } from '../services/sendOrderSuccessEmail'
import { OrderStatus } from '@prisma/client'

interface Order {
  id: string
  studentId: string
  instructions: string
  paperType: string
  numberOfPages: number
  dueDate: Date
  totalAmount: number
  depositAmount: number
  status: string
  uploadedFiles: { url: string; name: string; size: number; type: string }[]
}

interface OrderData {
  instructions: string
  paperType: string
  numberOfPages: number
  dueDate: string
  totalAmount: number
  depositAmount: number
  status: OrderStatus
}

export interface CreateOrderInput {
  studentId: string
  instructions: string
  paperType: string
  numberOfPages: number
  dueDate: Date
  uploadedFiles: {
    url: string
    name: string
    size: string
    type: string
  }[]
}

export const orderResolvers = {
  Query: {
    orders: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Please login to continue')
      }

      const orders = await context.prisma.order.findMany({
        where: { studentId: context.currentUser.id },
        include: { uploadedFiles: true },
      })

      if (orders.length === 0) {
        throw new Error('No orders found for this user')
      }

      // Check if all orders belong to the current user
      const unauthorizedOrders = orders.filter(
        (order) => order.studentId !== context.currentUser?.id
      )

      if (unauthorizedOrders.length > 0) {
        throw new Error('Unauthorized access to orders')
      }

      return orders
    },

    order: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const order = await context.prisma.order.findFirst({
        where: {
          id,
          studentId: context.currentUser.id,
        },
        include: { uploadedFiles: true },
      })

      if (!order)
        throw new Error(
          'Order not found or you do not have permission to view it'
        )

      return order
    },
  },
  Mutation: {
    createOrder: async (
      _: unknown,
      { input }: { input: CreateOrderInput },
      context: GraphQLContext
    ) => {
      const {
        studentId,
        instructions,
        paperType,
        numberOfPages,
        dueDate,
        uploadedFiles,
      } = input

      // Check if student exists
      const studentExists = await context.prisma.user.findUnique({
        where: { id: studentId },
      })
      if (!studentExists) throw new Error('Student not found')

      // Calculate amounts
      const totalAmount = numberOfPages * 20
      const depositAmount = totalAmount * 0.5

      // Save the order and any uploaded files
      const order = await context.prisma.order.create({
        data: {
          studentId,
          instructions,
          paperType,
          numberOfPages,
          dueDate,
          totalAmount,
          depositAmount,
          status: 'PENDING',
          uploadedFiles: {
            create: uploadedFiles.map((file) => ({
              url: file.url,
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          },
        },
        include: { uploadedFiles: true },
      })

      // Send confirmation email to the student
      if (studentExists.email) {
        await sendOrderSuccessEmail(
          studentExists.email,
          order.instructions,
          order.paperType,
          order.numberOfPages,
          order.dueDate.toString(),
          order.totalAmount,
          order.depositAmount,
          order.status,
          order.uploadedFiles
        )
      }

      return {
        success: true,
        message:
          'Order created successfully. A confirmation email has been sent.',
        order,
      }
    },

    updateOrder: async (
      _: unknown,
      {
        orderId,
        data,
      }: {
        orderId: string
        data: Partial<OrderData>
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Please login to continue')
      }

      try {
        // Fetch the order to verify ownership
        const order = await context.prisma.order.findUnique({
          where: { id: orderId },
        })

        if (!order) {
          throw new Error('Order not found')
        }

        if (order.studentId !== context.currentUser.id) {
          throw new Error('Unauthorized access to order')
        }

        // Proceed with the update
        const updatedOrder = await context.prisma.order.update({
          where: { id: orderId },
          data,
        })

        return updatedOrder
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
          console.error(
            'Error updating order:',
            error instanceof Error ? error.message : error
          )
        }

        throw new Error('Unauthorized access to order')
      }
    },
  },

  Order: {
    student: (parent: Order, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findUnique({ where: { id: parent.studentId } })
    },
    uploadedFiles: (parent: Order, _: unknown, context: GraphQLContext) => {
      return context.prisma.file.findMany({ where: { orderId: parent.id } })
    },
  },
}
