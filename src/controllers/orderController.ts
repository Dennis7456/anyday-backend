// orderController.ts
import { GraphQLContext } from '../context/context'
import { sendOrderSuccessEmail } from '../services/sendOrderSuccessEmail'
import { OrderStatus } from '@prisma/client'

interface UploadedFile {
  id: string
  orderId: string
  name: string
  url: string
  size: string
  mimeType: string | null
}

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
  uploadedFiles: UploadedFile[]
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
          include: {
            uploadedFiles: true,
          },
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

    deleteOrder: async (
      _: unknown,
      { orderId }: { orderId: string },
      context: GraphQLContext
    ): Promise<Order> => {
      if (!context.currentUser) {
        throw new Error('Please login to continue')
      }

      try {
        // Fetch the order to verify ownership
        const order = await context.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            uploadedFiles: true, // Ensure uploadedFiles is fetched
          },
        })

        if (!order) {
          throw new Error('Order not found')
        }

        if (order.studentId !== context.currentUser.id) {
          throw new Error('Unauthorized access to order')
        }

        // Proceed with the deletion and include uploadedFiles
        const deletedOrder = await context.prisma.order.delete({
          where: { id: orderId },
          include: {
            uploadedFiles: true, // Include uploadedFiles in the deleted result
          },
        })

        return deletedOrder // Return the deleted order details
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error deleting order:', error.message)

          // Rethrow specific errors
          if (
            error.message === 'Order not found' ||
            error.message === 'Unauthorized access to order'
          ) {
            throw error
          }

          if (error.message.includes('Database error')) {
            throw new Error('Database error')
          }
        }

        throw new Error('An error occurred while deleting the order.')
      }
    },

    Order: {
      student: (parent: Order, _: unknown, context: GraphQLContext) => {
        return context.prisma.user.findUnique({
          where: { id: parent.studentId },
        })
      },
      uploadedFiles: (parent: Order, _: unknown, context: GraphQLContext) => {
        return context.prisma.file.findMany({ where: { orderId: parent.id } })
      },
    },
  },
}
