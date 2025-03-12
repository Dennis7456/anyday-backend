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
exports.chatResolvers = void 0;
const subscriptionController_1 = require("./subscriptionController");
exports.chatResolvers = {
    Query: {
        chats: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const chats = yield context.prisma.chat.findMany({
                where: {
                    participants: {
                        some: { id: context.currentUser.id },
                    },
                },
                include: { messages: true, participants: true },
            });
            if (chats.length === 0) {
                throw new Error('No chats found for this user');
            }
            return chats;
        }),
        chat: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const chat = yield context.prisma.chat.findFirst({
                where: {
                    id,
                    participants: {
                        some: { id: context.currentUser.id },
                    },
                },
                include: { messages: true, participants: true },
            });
            if (!chat) {
                throw new Error('Chat not found or you do not have permission to view it');
            }
            return chat;
        }),
        // Get chats by order
        chatsByOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const chats = yield context.prisma.chat.findMany({
                where: {
                    orderId,
                    participants: {
                        some: { id: context.currentUser.id },
                    },
                },
                include: { messages: true, participants: true },
            });
            if (chats.length === 0) {
                throw new Error('No chats found for this order');
            }
            return chats;
        }),
        // Get chats by user
        chatsByUser: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { userId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only allow the user themselves or an admin to access chats by user
            if (context.currentUser.id !== userId &&
                context.currentUser.role !== 'ADMIN') {
                throw new Error('Unauthorized access to user chats');
            }
            const chats = yield context.prisma.chat.findMany({
                where: {
                    participants: {
                        some: { id: userId },
                    },
                },
                include: { messages: true, participants: true },
            });
            if (chats.length === 0) {
                throw new Error('No chats found for this user');
            }
            return chats;
        }),
    },
    Mutation: {
        createChat: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Ensure the current user is among the participants
            if (!input.participantIds.includes(context.currentUser.id)) {
                throw new Error('You must be a participant in the chat');
            }
            const chat = yield context.prisma.chat.create({
                data: {
                    orderId: input.orderId,
                    participants: {
                        connect: input.participantIds.map((id) => ({ id })),
                    },
                },
                include: { messages: true, participants: true },
            });
            // Publish chat added event for real-time updates
            subscriptionController_1.pubsub.publish(subscriptionController_1.EVENTS.CHAT_ADDED, { chatAdded: chat });
            return {
                success: true,
                message: 'Chat created successfully.',
                chat,
            };
        }),
        sendMessage: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the chat to verify participation
            const chat = yield context.prisma.chat.findUnique({
                where: { id: input.chatId },
                include: { participants: true },
            });
            if (!chat) {
                throw new Error('Chat not found');
            }
            const isParticipant = chat.participants.some((participant) => { var _a; return participant.id === ((_a = context.currentUser) === null || _a === void 0 ? void 0 : _a.id); });
            if (!isParticipant) {
                throw new Error('You are not a participant in this chat');
            }
            const message = yield context.prisma.message.create({
                data: {
                    chatId: input.chatId,
                    senderId: context.currentUser.id,
                    recipientId: input.recipientId,
                    content: input.content,
                    isRead: false,
                },
                include: {
                    chat: true,
                    sender: true,
                    recipient: true,
                },
            });
            // Publish message added event for real-time updates
            subscriptionController_1.pubsub.publish(subscriptionController_1.EVENTS.MESSAGE_ADDED, { messageAdded: message });
            return {
                success: true,
                message: 'Message sent successfully.',
                messageData: message,
            };
        }),
    },
    Chat: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
        messages: (parent, _, context) => {
            return context.prisma.message.findMany({
                where: { chatId: parent.id },
            });
        },
        participants: (parent, _, context) => {
            return context.prisma.user.findMany({
                where: {
                    chats: {
                        some: { id: parent.id },
                    },
                },
            });
        },
    },
    Message: {
        chat: (parent, _, context) => {
            return context.prisma.chat.findUnique({
                where: { id: parent.chatId },
            });
        },
        sender: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.senderId },
            });
        },
        recipient: (parent, _, context) => {
            return parent.recipientId
                ? context.prisma.user.findUnique({
                    where: { id: parent.recipientId },
                })
                : null;
        },
    },
};
