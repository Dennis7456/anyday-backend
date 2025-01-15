import { GraphQLContext } from '../context/context'

interface File {
  id: string
  url: string
  name: string
  size: string
  mimeType: string | null
  orderId: string
}

export const fileResolvers = {
  Query: {
    files: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const files = await context.prisma.file.findMany({
        where: {
          order: {
            studentId: context.currentUser.id,
          },
        },
        include: { order: true },
      })

      if (files.length === 0) {
        throw new Error('No files found for this user')
      }

      return files
    },

    file: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const file = await context.prisma.file.findFirst({
        where: {
          id,
          order: {
            studentId: context.currentUser.id,
          },
        },
        include: { order: true },
      })

      if (!file) {
        throw new Error(
          'File not found or you do not have permission to view it'
        )
      }

      return file
    },

    // Get files by order
    filesByOrder: async (
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
        throw new Error('Unauthorized access to files for this order')
      }

      const files = await context.prisma.file.findMany({
        where: { orderId },
        include: { order: true },
      })

      if (files.length === 0) {
        throw new Error('No files found for this order')
      }

      return files
    },
  },
  Mutation: {
    uploadFiles: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          orderId: string
          files: {
            url: string
            name: string
            size: string
            mimeType?: string
          }[]
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

      const files = await context.prisma.file.createMany({
        data: input.files.map((file) => ({
          orderId: input.orderId,
          url: file.url,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        })),
      })

      return {
        success: true,
        message: 'Files uploaded successfully.',
        files,
      }
    },

    deleteFile: async (
      _: unknown,
      { fileId }: { fileId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the file
      const file = await context.prisma.file.findUnique({
        where: { id: fileId },
        include: { order: true },
      })

      if (!file) {
        throw new Error('File not found')
      }

      if (file.order.studentId !== context.currentUser.id) {
        throw new Error('Unauthorized access to file')
      }

      // Proceed with the deletion
      const deletedFile = await context.prisma.file.delete({
        where: { id: fileId },
      })

      return deletedFile
    },
  },
  File: {
    order: (parent: File, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      })
    },
  },
}
