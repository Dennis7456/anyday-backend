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
exports.fileResolvers = void 0;
exports.fileResolvers = {
    Query: {
        files: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const files = yield context.prisma.file.findMany({
                where: {
                    order: {
                        studentId: context.currentUser.id,
                    },
                },
                include: { order: true },
            });
            if (files.length === 0) {
                throw new Error('No files found for this user');
            }
            return files;
        }),
        file: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const file = yield context.prisma.file.findFirst({
                where: {
                    id,
                    order: {
                        studentId: context.currentUser.id,
                    },
                },
                include: { order: true },
            });
            if (!file) {
                throw new Error('File not found or you do not have permission to view it');
            }
            return file;
        }),
        // Get files by order
        filesByOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the order to verify ownership
            const order = yield context.prisma.order.findUnique({
                where: { id: orderId },
            });
            if (!order) {
                throw new Error('Order not found');
            }
            if (order.studentId !== context.currentUser.id) {
                throw new Error('Unauthorized access to files for this order');
            }
            const files = yield context.prisma.file.findMany({
                where: { orderId },
                include: { order: true },
            });
            if (files.length === 0) {
                throw new Error('No files found for this order');
            }
            return files;
        }),
    },
    Mutation: {
        uploadFiles: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the order to verify ownership
            const order = yield context.prisma.order.findUnique({
                where: { id: input.orderId },
            });
            if (!order) {
                throw new Error('Order not found');
            }
            if (order.studentId !== context.currentUser.id) {
                throw new Error('Unauthorized access to order');
            }
            const files = yield context.prisma.file.createMany({
                data: input.files.map((file) => ({
                    orderId: input.orderId,
                    url: file.url,
                    name: file.name,
                    size: file.size,
                    mimeType: file.mimeType,
                })),
            });
            return {
                success: true,
                message: 'Files uploaded successfully.',
                files,
            };
        }),
        deleteFile: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { fileId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the file
            const file = yield context.prisma.file.findUnique({
                where: { id: fileId },
                include: { order: true },
            });
            if (!file) {
                throw new Error('File not found');
            }
            if (file.order.studentId !== context.currentUser.id) {
                throw new Error('Unauthorized access to file');
            }
            // Proceed with the deletion
            const deletedFile = yield context.prisma.file.delete({
                where: { id: fileId },
            });
            return deletedFile;
        }),
    },
    File: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
    },
};
