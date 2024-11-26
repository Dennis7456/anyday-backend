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
exports.orderResolvers = void 0;
const sendOrderSuccessEmail_1 = require("../services/sendOrderSuccessEmail");
exports.orderResolvers = {
    Query: {
        orders: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            const orders = yield context.prisma.order.findMany({
                where: { studentId: context.currentUser.id },
                include: { uploadedFiles: true },
            });
            if (orders.length === 0) {
                throw new Error('No orders found for this user');
            }
            // Check if all orders belong to the current user
            const unauthorizedOrders = orders.filter((order) => { var _a; return order.studentId !== ((_a = context.currentUser) === null || _a === void 0 ? void 0 : _a.id); });
            if (unauthorizedOrders.length > 0) {
                throw new Error('Unauthorized access to orders');
            }
            return orders;
        }),
        order: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const order = yield context.prisma.order.findFirst({
                where: {
                    id,
                    studentId: context.currentUser.id,
                },
                include: { uploadedFiles: true },
            });
            if (!order)
                throw new Error('Order not found or you do not have permission to view it');
            return order;
        }),
    },
    Mutation: {
        createOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input }, context) {
            const { studentId, instructions, paperType, numberOfPages, dueDate, uploadedFiles, } = input;
            // Check if student exists
            const studentExists = yield context.prisma.user.findUnique({
                where: { id: studentId },
            });
            if (!studentExists)
                throw new Error('Student not found');
            // Calculate amounts
            const totalAmount = numberOfPages * 20;
            const depositAmount = totalAmount * 0.5;
            // Save the order and any uploaded files
            const order = yield context.prisma.order.create({
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
            });
            // Send confirmation email to the student
            if (studentExists.email) {
                yield (0, sendOrderSuccessEmail_1.sendOrderSuccessEmail)(studentExists.email, order.instructions, order.paperType, order.numberOfPages, order.dueDate.toString(), order.totalAmount, order.depositAmount, order.status, order.uploadedFiles);
            }
            return {
                success: true,
                message: 'Order created successfully. A confirmation email has been sent.',
                order,
            };
        }),
        updateOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId, data, }, context) {
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            try {
                // Fetch the order to verify ownership
                const order = yield context.prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        uploadedFiles: true,
                    },
                });
                if (!order) {
                    throw new Error('Order not found');
                }
                if (order.studentId !== context.currentUser.id) {
                    throw new Error('Unauthorized access to order');
                }
                // Proceed with the update
                const updatedOrder = yield context.prisma.order.update({
                    where: { id: orderId },
                    data,
                });
                return updatedOrder;
            }
            catch (error) {
                if (process.env.NODE_ENV !== 'test') {
                    console.error('Error updating order:', error instanceof Error ? error.message : error);
                }
                throw new Error('Unauthorized access to order');
            }
        }),
        deleteOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId }, context) {
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            try {
                // Fetch the order to verify ownership
                const order = yield context.prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        uploadedFiles: true, // Ensure uploadedFiles is fetched
                    },
                });
                if (!order) {
                    throw new Error('Order not found');
                }
                if (order.studentId !== context.currentUser.id) {
                    throw new Error('Unauthorized access to order');
                }
                // Proceed with the deletion and include uploadedFiles
                const deletedOrder = yield context.prisma.order.delete({
                    where: { id: orderId },
                    include: {
                        uploadedFiles: true, // Include uploadedFiles in the deleted result
                    },
                });
                return deletedOrder; // Return the deleted order details
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Error deleting order:', error.message);
                    // Rethrow specific errors
                    if (error.message === 'Order not found' ||
                        error.message === 'Unauthorized access to order') {
                        throw error;
                    }
                    if (error.message.includes('Database error')) {
                        throw new Error('Database error');
                    }
                }
                throw new Error('An error occurred while deleting the order.');
            }
        }),
    },
    Order: {
        student: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.studentId },
            });
        },
        uploadedFiles: (parent, _, context) => {
            return context.prisma.file.findMany({ where: { orderId: parent.id } });
        },
    },
};
