import { GraphQLContext } from '../context/context'
import { NotificationType } from '@prisma/client'

interface Notification {
  id: string
  recipientId: string
  type: NotificationType
  message: string
  link: string
  isRead: boolean
  createdAt: Date
}

export const notificationResolvers = {
  Query: {
    notifications: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const notifications = await context.prisma.notification.findMany({
        where: { recipientId: context.currentUser.id },
      })

      if (notifications.length === 0) {
        throw new Error('No notifications found for this user')
      }

      return notifications
    },

    notification: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const notification = await context.prisma.notification.findFirst({
        where: {
          id,
          recipientId: context.currentUser.id,
        },
      })

      if (!notification) {
        throw new Error(
          'Notification not found or you do not have permission to view it'
        )
      }

      return notification
    },

    // Get notifications by order
    notificationsByOrder: async (
      _: unknown,
      { orderId }: { orderId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const notifications = await context.prisma.notification.findMany({
        where: {
          recipientId: context.currentUser.id,
          link: {
            contains: orderId,
          },
        },
      })

      if (notifications.length === 0) {
        throw new Error('No notifications found for this order')
      }

      return notifications
    },
  },
  Mutation: {
    markNotificationAsRead: async (
      _: unknown,
      { notificationId }: { notificationId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the notification
      const notification = await context.prisma.notification.findUnique({
        where: { id: notificationId },
      })

      if (!notification) {
        throw new Error('Notification not found')
      }

      if (notification.recipientId !== context.currentUser.id) {
        throw new Error('Unauthorized access to notification')
      }

      // Update the notification
      const updatedNotification = await context.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      })

      return updatedNotification
    },

    deleteNotification: async (
      _: unknown,
      { notificationId }: { notificationId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the notification
      const notification = await context.prisma.notification.findUnique({
        where: { id: notificationId },
      })

      if (!notification) {
        throw new Error('Notification not found')
      }

      if (notification.recipientId !== context.currentUser.id) {
        throw new Error('Unauthorized access to notification')
      }

      // Proceed with the deletion
      const deletedNotification = await context.prisma.notification.delete({
        where: { id: notificationId },
      })

      return deletedNotification
    },
  },
  Notification: {
    recipient: (parent: Notification, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.recipientId },
      })
    },
  },
}
