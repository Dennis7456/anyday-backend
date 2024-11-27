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
exports.assignmentResolvers = void 0;
exports.assignmentResolvers = {
    Query: {
        assignments: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const assignments = yield context.prisma.assignment.findMany({
                where: { writerId: context.currentUser.id },
                include: { order: true },
            });
            if (assignments.length === 0) {
                throw new Error('No assignments found for this user');
            }
            return assignments;
        }),
        assignment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            const assignment = yield context.prisma.assignment.findFirst({
                where: {
                    id,
                    writerId: context.currentUser.id,
                },
                include: { order: true },
            });
            if (!assignment) {
                throw new Error('Assignment not found or you do not have permission to view it');
            }
            return assignment;
        }),
        // Get assignments by order
        assignmentsByOrder: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { orderId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only Admin or QA can access assignments by order
            if (context.currentUser.role !== 'ADMIN' &&
                context.currentUser.role !== 'QA') {
                throw new Error('Only Admin or QA can access assignments by order');
            }
            const assignments = yield context.prisma.assignment.findMany({
                where: { orderId },
                include: { order: true, writer: true },
            });
            if (assignments.length === 0) {
                throw new Error('No assignments found for this order');
            }
            return assignments;
        }),
        // Get assignments by writer
        assignmentsByWriter: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { writerId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only Admin, QA, or the writer themselves can access assignments by writer
            if (context.currentUser.role !== 'ADMIN' &&
                context.currentUser.role !== 'QA' &&
                context.currentUser.id !== writerId) {
                throw new Error('Unauthorized access to writer assignments');
            }
            const assignments = yield context.prisma.assignment.findMany({
                where: { writerId },
                include: { order: true, writer: true },
            });
            if (assignments.length === 0) {
                throw new Error('No assignments found for this writer');
            }
            return assignments;
        }),
    },
    Mutation: {
        createAssignment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { input, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only Admin or QA can assign orders
            if (context.currentUser.role !== 'ADMIN' &&
                context.currentUser.role !== 'QA') {
                throw new Error('Only Admin or QA can create assignments');
            }
            const assignment = yield context.prisma.assignment.create({
                data: {
                    orderId: input.orderId,
                    writerId: input.writerId,
                    status: 'PENDING',
                },
                include: { order: true },
            });
            return {
                success: true,
                message: 'Assignment created successfully.',
                assignment,
            };
        }),
        updateAssignment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { assignmentId, data, }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Fetch the assignment to verify ownership
            const assignment = yield context.prisma.assignment.findUnique({
                where: { id: assignmentId },
            });
            if (!assignment) {
                throw new Error('Assignment not found');
            }
            if (assignment.writerId !== context.currentUser.id) {
                throw new Error('Unauthorized access to assignment');
            }
            // Proceed with the update
            const updatedAssignment = yield context.prisma.assignment.update({
                where: { id: assignmentId },
                data,
            });
            return updatedAssignment;
        }),
        deleteAssignment: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { assignmentId }, context) {
            if (!context.currentUser)
                throw new Error('Please login to continue');
            // Only Admin or QA can delete assignments
            if (context.currentUser.role !== 'ADMIN' &&
                context.currentUser.role !== 'QA') {
                throw new Error('Only Admin or QA can delete assignments');
            }
            // Fetch the assignment
            const assignment = yield context.prisma.assignment.findUnique({
                where: { id: assignmentId },
            });
            if (!assignment) {
                throw new Error('Assignment not found');
            }
            // Proceed with the deletion
            const deletedAssignment = yield context.prisma.assignment.delete({
                where: { id: assignmentId },
            });
            return deletedAssignment;
        }),
    },
    Assignment: {
        order: (parent, _, context) => {
            return context.prisma.order.findUnique({
                where: { id: parent.orderId },
            });
        },
        writer: (parent, _, context) => {
            return context.prisma.user.findUnique({
                where: { id: parent.writerId },
            });
        },
    },
};
