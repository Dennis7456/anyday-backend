// orderController.ts
import { GraphQLContext } from '../context/context'
import { sendOrderSuccessEmail } from '../services/sendOrderSuccessEmail'
import { OrderStatus, PaperType, Prisma } from '@prisma/client'

// Define the OrderUpdateInput interface
interface OrderUpdateInput {
  instructions?: string
  paperType?: PaperType
  numberOfPages?: number
  dueDate?: string
  totalAmount?: number
  depositAmount?: number
  status?: OrderStatus
  uploadedFiles?: {
    url: string
    name: string
    size: string
    mimeType: string
  }[]
}

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
  paperType: PaperType
  numberOfPages: number
  dueDate: Date
  totalAmount: number
  depositAmount: number
  status: string
  uploadedFiles: UploadedFile[]
}

// interface OrderData {
//   instructions: string;
//   paperType: PaperType;
//   numberOfPages: number;
//   dueDate: string;
//   totalAmount: number;
//   depositAmount: number;
//   status: OrderStatus;
//   uploadedFiles: UploadedFile[];
// }

export interface CreateOrderInput {
  studentId: string
  instructions: string
  paperType: PaperType
  numberOfPages: number
  dueDate: Date
  uploadedFiles: {
    url: string
    name: string
    size: string
    mimeType: string
  }[]
}

export const orderResolvers = {
  Query: {
    getOrders: async (_: unknown, __: unknown, context: GraphQLContext) => {
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

    getOrder: async (
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

      // Check if the user is logged in
      // if (!context.currentUser) {
      //   throw new Error('Please login to continue')
      // }

      // Validate paperType
      if (!Object.values(PaperType).includes(paperType)) {
        throw new Error(`Invalid paperType: ${paperType}`)
      }

      // const currentUser = context.currentUser.id

      try {
        // Check if the student exists
        const studentExists = await context.prisma.user.findUnique({
          where: { id: studentId },
        })

        if (!studentExists) {
          return {
            success: false,
            message: 'Student not found',
            order: null,
          }
        }

        // Calculate amounts
        const totalAmount = numberOfPages * 20
        const depositAmount = totalAmount * 0.5

        const formattedDueDate = new Date(dueDate).toISOString()

        // Create the order
        const order = await context.prisma.order.create({
          data: {
            studentId: studentId, // Link the order to the student
            instructions,
            paperType: paperType as PaperType,
            numberOfPages,
            dueDate: formattedDueDate,
            totalAmount,
            depositAmount,
            status: 'PENDING',
            uploadedFiles: {
              create: uploadedFiles.map((file) => ({
                url: file.url,
                name: file.name,
                size: file.size,
                mimeType: file.mimeType,
              })),
            },
          },
          select: {
            id: true,
            studentId: true,
            instructions: true,
            paperType: true,
            numberOfPages: true,
            dueDate: true,
            totalAmount: true,
            depositAmount: true,
            status: true,
            uploadedFiles: {
              select: {
                id: true,
                url: true,
                name: true,
                size: true,
                mimeType: true,
              },
            },
          },
        })

        // Send confirmation email
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

        console.log('Order from creation resolver:', order)

        return {
          success: true,
          message:
            'Order created successfully. A confirmation email has been sent.',
          order,
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error creating order:', error.message)
          return {
            success: false,
            message: 'An error occurred while creating the order',
            order: null,
          }
        }
        // If the error is not an instance of Error, rethrow it
        throw error
      }
    },

    updateOrder: async (
      _: unknown,
      { orderId, data }: { orderId: string; data: OrderUpdateInput },
      context: GraphQLContext
    ): Promise<Order> => {
      if (!context.currentUser) {
        throw new Error('Please login to continue')
      }

      try {
        const order = await context.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            uploadedFiles: true,
          },
        })

        if (!order) {
          throw new Error('Order not found')
        }

        // Check if the user has permission to update the order
        if (
          order.studentId !== context.currentUser.id &&
          context.currentUser.role !== 'ADMIN'
        ) {
          throw new Error('Unauthorized access to order')
        }

        // For STUDENT role, restrict updating certain fields
        if (context.currentUser.role === 'STUDENT') {
          const disallowedFields: (keyof OrderUpdateInput)[] = [
            'totalAmount',
            'depositAmount',
            'status',
          ]
          for (const field of disallowedFields) {
            if (data[field] !== undefined) {
              throw new Error(
                `You are not authorized to update the ${field} field`
              )
            }
          }
        }

        const updateData: Prisma.OrderUpdateInput = {}

        if (data.instructions !== undefined) {
          updateData.instructions = data.instructions
        }

        if (data.paperType !== undefined) {
          if (!Object.values(PaperType).includes(data.paperType)) {
            throw new Error(`Invalid paperType: ${data.paperType}`)
          }
          updateData.paperType = data.paperType
        }

        if (data.numberOfPages !== undefined) {
          if (data.numberOfPages <= 0) {
            throw new Error('numberOfPages must be a positive integer')
          }
          updateData.numberOfPages = data.numberOfPages
        }

        if (data.dueDate !== undefined) {
          const parsedDate = new Date(data.dueDate)
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid dueDate format')
          }
          updateData.dueDate = parsedDate
        }

        // Admin can update totalAmount, depositAmount, status
        if (context.currentUser.role === 'ADMIN') {
          if (data.totalAmount !== undefined) {
            if (data.totalAmount < 0) {
              throw new Error('totalAmount cannot be negative')
            }
            updateData.totalAmount = data.totalAmount
          }

          if (data.depositAmount !== undefined) {
            if (data.depositAmount < 0) {
              throw new Error('depositAmount cannot be negative')
            }
            updateData.depositAmount = data.depositAmount
          }

          if (data.status !== undefined) {
            if (!Object.values(OrderStatus).includes(data.status)) {
              throw new Error(`Invalid status: ${data.status}`)
            }
            updateData.status = data.status
          }
        }

        const updatedOrder = await context.prisma.order.update({
          where: { id: orderId },
          data: updateData,
          include: {
            uploadedFiles: true,
          },
        })

        return updatedOrder
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error updating order:', error.message)

          // Rethrow specific errors
          if (
            error.message === 'Order not found' ||
            error.message === 'Unauthorized access to order' ||
            error.message.startsWith('You are not authorized') ||
            error.message.startsWith('Invalid')
          ) {
            throw error
          }

          if (error.message.includes('Database error')) {
            throw new Error('Database error')
          }
        }

        throw new Error('An error occurred while updating the order.')
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
}
