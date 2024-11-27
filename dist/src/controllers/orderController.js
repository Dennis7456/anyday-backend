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
const client_1 = require("@prisma/client");
exports.orderResolvers = {
    Query: {
        getOrders: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
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
        getOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
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
            const { instructions, paperType, numberOfPages, dueDate, uploadedFiles } = input;
            // Check if the user is logged in
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            // Validate paperType
            if (!Object.values(client_1.PaperType).includes(paperType)) {
                throw new Error(`Invalid paperType: ${paperType}`);
            }
            const currentUser = context.currentUser.id;
            try {
                // Check if the student exists
                const studentExists = yield context.prisma.user.findUnique({
                    where: { id: currentUser },
                });
                if (!studentExists) {
                    return {
                        success: false,
                        message: 'Student not found',
                        order: null,
                    };
                }
                // Calculate amounts
                const totalAmount = numberOfPages * 20;
                const depositAmount = totalAmount * 0.5;
                const formattedDueDate = new Date(dueDate).toISOString();
                // Create the order
                const order = yield context.prisma.order.create({
                    data: {
                        studentId: currentUser, // Link the order to the student
                        instructions,
                        paperType: paperType,
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
                });
                // Send confirmation email
                if (studentExists.email) {
                    yield (0, sendOrderSuccessEmail_1.sendOrderSuccessEmail)(studentExists.email, order.instructions, order.paperType, order.numberOfPages, order.dueDate.toString(), order.totalAmount, order.depositAmount, order.status, order.uploadedFiles);
                }
                console.log('Order from creation resolver:', order);
                return {
                    success: true,
                    message: 'Order created successfully. A confirmation email has been sent.',
                    order,
                };
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Error creating order:', error.message);
                    return {
                        success: false,
                        message: 'An error occurred while creating the order',
                        order: null,
                    };
                }
                // If the error is not an instance of Error, rethrow it
                throw error;
            }
        }),
        updateOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId, data }, context) {
            if (!context.currentUser) {
                throw new Error('Please login to continue');
            }
            try {
                const order = yield context.prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        uploadedFiles: true,
                    },
                });
                if (!order) {
                    throw new Error('Order not found');
                }
                // Check if the user has permission to update the order
                if (order.studentId !== context.currentUser.id &&
                    context.currentUser.role !== 'ADMIN') {
                    throw new Error('Unauthorized access to order');
                }
                // For STUDENT role, restrict updating certain fields
                if (context.currentUser.role === 'STUDENT') {
                    const disallowedFields = [
                        'totalAmount',
                        'depositAmount',
                        'status',
                    ];
                    for (const field of disallowedFields) {
                        if (data[field] !== undefined) {
                            throw new Error(`You are not authorized to update the ${field} field`);
                        }
                    }
                }
                const updateData = {};
                if (data.instructions !== undefined) {
                    updateData.instructions = data.instructions;
                }
                if (data.paperType !== undefined) {
                    if (!Object.values(client_1.PaperType).includes(data.paperType)) {
                        throw new Error(`Invalid paperType: ${data.paperType}`);
                    }
                    updateData.paperType = data.paperType;
                }
                if (data.numberOfPages !== undefined) {
                    if (data.numberOfPages <= 0) {
                        throw new Error('numberOfPages must be a positive integer');
                    }
                    updateData.numberOfPages = data.numberOfPages;
                }
                if (data.dueDate !== undefined) {
                    const parsedDate = new Date(data.dueDate);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error('Invalid dueDate format');
                    }
                    updateData.dueDate = parsedDate;
                }
                // Admin can update totalAmount, depositAmount, status
                if (context.currentUser.role === 'ADMIN') {
                    if (data.totalAmount !== undefined) {
                        if (data.totalAmount < 0) {
                            throw new Error('totalAmount cannot be negative');
                        }
                        updateData.totalAmount = data.totalAmount;
                    }
                    if (data.depositAmount !== undefined) {
                        if (data.depositAmount < 0) {
                            throw new Error('depositAmount cannot be negative');
                        }
                        updateData.depositAmount = data.depositAmount;
                    }
                    if (data.status !== undefined) {
                        if (!Object.values(client_1.OrderStatus).includes(data.status)) {
                            throw new Error(`Invalid status: ${data.status}`);
                        }
                        updateData.status = data.status;
                    }
                }
                const updatedOrder = yield context.prisma.order.update({
                    where: { id: orderId },
                    data: updateData,
                    include: {
                        uploadedFiles: true,
                    },
                });
                return updatedOrder;
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Error updating order:', error.message);
                    // Rethrow specific errors
                    if (error.message === 'Order not found' ||
                        error.message === 'Unauthorized access to order' ||
                        error.message.startsWith('You are not authorized') ||
                        error.message.startsWith('Invalid')) {
                        throw error;
                    }
                    if (error.message.includes('Database error')) {
                        throw new Error('Database error');
                    }
                }
                throw new Error('An error occurred while updating the order.');
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
