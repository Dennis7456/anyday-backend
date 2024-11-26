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
exports.notificationResolvers = void 0;
exports.notificationResolvers = {
    Query: {
        notifications: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const notifications = yield context.prisma.notification.findMany({
                where: { recipientId: context.currentUser.id },
            });
            if (notifications.length === 0) {
                throw new Error('No notifications found for this user');
            }
            return notifications;
        }),
        notification: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const notification = yield context.prisma.notification.findFirst({
                where: {
                    id,
                    recipientId: context.currentUser.id,
                },
            });
            if (!notification) {
                throw new Error('Notification not found or you do not have permission to view it');
            }
            return notification;
        }),
    },
    Mutation: {
        markNotificationAsRead: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { notificationId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the notification
            const notification = yield context.prisma.notification.findUnique({
                where: { id: notificationId },
            });
            if (!notification) {
                throw new Error('Notification not found');
            }
            if (notification.recipientId !== context.currentUser.id) {
                throw new Error('Unauthorized access to notification');
            }
            // Update the notification
            const updatedNotification = yield context.prisma.notification.update({
                where: { id: notificationId },
                data: { isRead: true },
            });
            return updatedNotification;
        }),
        deleteNotification: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { notificationId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the notification
            const notification = yield context.prisma.notification.findUnique({
                where: { id: notificationId },
            });
            if (!notification) {
                throw new Error('Notification not found');
            }
            if (notification.recipientId !== context.currentUser.id) {
                throw new Error('Unauthorized access to notification');
            }
            // Proceed with the deletion
            const deletedNotification = yield context.prisma.notification.delete({
                where: { id: notificationId },
            });
            return deletedNotification;
        }),
    },
    Notification: {
        recipient: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.recipientId },
            });
        },
    },
};
