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
exports.paymentResolvers = void 0;
exports.paymentResolvers = {
    Query: {
        payments: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const payments = yield context.prisma.payment.findMany({
                where: {
                    order: {
                        studentId: context.currentUser.id,
                    },
                },
                include: { order: true },
            });
            if (payments.length === 0) {
                throw new Error('No payments found for this user');
            }
            return payments;
        }),
        payment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const payment = yield context.prisma.payment.findFirst({
                where: {
                    id,
                    order: {
                        studentId: context.currentUser.id,
                    },
                },
                include: { order: true },
            });
            if (!payment) {
                throw new Error('Payment not found or you do not have permission to view it');
            }
            return payment;
        }),
        // Get payments by order
        paymentsByOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId }, context) {
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
                throw new Error('Unauthorized access to payments for this order');
            }
            const payments = yield context.prisma.payment.findMany({
                where: { orderId },
                include: { order: true },
            });
            if (payments.length === 0) {
                throw new Error('No payments found for this order');
            }
            return payments;
        }),
        // Get payment by transaction ID
        paymentByTransactionId: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { transactionId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const payment = yield context.prisma.payment.findFirst({
                where: {
                    transactionId,
                    order: {
                        studentId: context.currentUser.id,
                    },
                },
                include: { order: true },
            });
            if (!payment) {
                throw new Error('Payment not found or you do not have permission to view it');
            }
            return payment;
        }),
    },
    Mutation: {
        createPayment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input, }, context) {
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
            const payment = yield context.prisma.payment.create({
                data: {
                    orderId: input.orderId,
                    amount: input.amount,
                    paymentStatus: 'COMPLETED',
                    paymentMethod: input.paymentMethod,
                    transactionId: input.transactionId,
                },
                include: { order: true },
            });
            return {
                success: true,
                message: 'Payment processed successfully.',
                payment,
            };
        }),
        updatePayment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { paymentId, data, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only Admin can update payments
            if (context.currentUser.role !== 'ADMIN') {
                throw new Error('Only Admin can update payments');
            }
            // Fetch the payment
            const payment = yield context.prisma.payment.findUnique({
                where: { id: paymentId },
            });
            if (!payment) {
                throw new Error('Payment not found');
            }
            // Proceed with the update
            const updatedPayment = yield context.prisma.payment.update({
                where: { id: paymentId },
                data,
            });
            return updatedPayment;
        }),
        deletePayment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { paymentId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only Admin can delete payments
            if (context.currentUser.role !== 'ADMIN') {
                throw new Error('Only Admin can delete payments');
            }
            // Fetch the payment
            const payment = yield context.prisma.payment.findUnique({
                where: { id: paymentId },
            });
            if (!payment) {
                throw new Error('Payment not found');
            }
            // Proceed with the deletion
            const deletedPayment = yield context.prisma.payment.delete({
                where: { id: paymentId },
            });
            return deletedPayment;
        }),
    },
    Payment: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
    },
};
