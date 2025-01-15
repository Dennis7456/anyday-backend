import { GraphQLContext } from '../context/context'

interface Chat {
  id: string
  orderId: string
  createdAt: Date
  updatedAt: Date
}

interface Message {
  id: string
  chatId: string
  senderId: string
  recipientId: string | null
  content: string
  isRead: boolean
  createdAt: Date
}

export const chatResolvers = {
  Query: {
    chats: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const chats = await context.prisma.chat.findMany({
        where: {
          participants: {
            some: { id: context.currentUser.id },
          },
        },
        include: { messages: true, participants: true },
      })

      if (chats.length === 0) {
        throw new Error('No chats found for this user')
      }

      return chats
    },

    chat: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const chat = await context.prisma.chat.findFirst({
        where: {
          id,
          participants: {
            some: { id: context.currentUser.id },
          },
        },
        include: { messages: true, participants: true },
      })

      if (!chat) {
        throw new Error(
          'Chat not found or you do not have permission to view it'
        )
      }

      return chat
    },

    // Get chats by order
    chatsByOrder: async (
      _: unknown,
      { orderId }: { orderId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const chats = await context.prisma.chat.findMany({
        where: {
          orderId,
          participants: {
            some: { id: context.currentUser.id },
          },
        },
        include: { messages: true, participants: true },
      })

      if (chats.length === 0) {
        throw new Error('No chats found for this order')
      }

      return chats
    },

    // Get chats by user
    chatsByUser: async (
      _: unknown,
      { userId }: { userId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only allow the user themselves or an admin to access chats by user
      if (
        context.currentUser.id !== userId &&
        context.currentUser.role !== 'ADMIN'
      ) {
        throw new Error('Unauthorized access to user chats')
      }

      const chats = await context.prisma.chat.findMany({
        where: {
          participants: {
            some: { id: userId },
          },
        },
        include: { messages: true, participants: true },
      })

      if (chats.length === 0) {
        throw new Error('No chats found for this user')
      }

      return chats
    },
  },
  Mutation: {
    createChat: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          orderId: string
          participantIds: string[]
        }
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Ensure the current user is among the participants
      if (!input.participantIds.includes(context.currentUser.id)) {
        throw new Error('You must be a participant in the chat')
      }

      const chat = await context.prisma.chat.create({
        data: {
          orderId: input.orderId,
          participants: {
            connect: input.participantIds.map((id) => ({ id })),
          },
        },
        include: { messages: true, participants: true },
      })

      return {
        success: true,
        message: 'Chat created successfully.',
        chat,
      }
    },

    sendMessage: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          chatId: string
          content: string
          recipientId?: string
        }
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the chat to verify participation
      const chat = await context.prisma.chat.findUnique({
        where: { id: input.chatId },
        include: { participants: true },
      })

      if (!chat) {
        throw new Error('Chat not found')
      }

      const isParticipant = chat.participants.some(
        (participant) => participant.id === context.currentUser?.id
      )

      if (!isParticipant) {
        throw new Error('You are not a participant in this chat')
      }

      const message = await context.prisma.message.create({
        data: {
          chatId: input.chatId,
          senderId: context.currentUser.id,
          recipientId: input.recipientId,
          content: input.content,
        },
        include: { chat: true },
      })

      return {
        success: true,
        message: 'Message sent successfully.',
        data: message,
      }
    },
  },
  Chat: {
    order: (parent: Chat, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      })
    },
    messages: (parent: Chat, _: unknown, context: GraphQLContext) => {
      return context.prisma.message.findMany({
        where: { chatId: parent.id },
      })
    },
    participants: (parent: Chat, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findMany({
        where: {
          chats: {
            some: { id: parent.id },
          },
        },
      })
    },
  },
  Message: {
    chat: (parent: Message, _: unknown, context: GraphQLContext) => {
      return context.prisma.chat.findUnique({
        where: { id: parent.chatId },
      })
    },
    sender: (parent: Message, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.senderId },
      })
    },
    recipient: (parent: Message, _: unknown, context: GraphQLContext) => {
      return parent.recipientId
        ? context.prisma.user.findUnique({
            where: { id: parent.recipientId },
          })
        : null
    },
  },
}
