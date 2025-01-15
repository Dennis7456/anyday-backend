import { GraphQLContext } from '../context/context'
import { AssignmentStatus } from '@prisma/client'

interface Assignment {
  id: string
  orderId: string
  writerId: string
  assignedAt: Date
  completedAt: Date | null
  status: AssignmentStatus
}

export const assignmentResolvers = {
  Query: {
    assignments: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const assignments = await context.prisma.assignment.findMany({
        where: { writerId: context.currentUser.id },
        include: { order: true },
      })

      if (assignments.length === 0) {
        throw new Error('No assignments found for this user')
      }

      return assignments
    },

    assignment: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      const assignment = await context.prisma.assignment.findFirst({
        where: {
          id,
          writerId: context.currentUser.id,
        },
        include: { order: true },
      })

      if (!assignment) {
        throw new Error(
          'Assignment not found or you do not have permission to view it'
        )
      }

      return assignment
    },

    // Get assignments by order
    assignmentsByOrder: async (
      _: unknown,
      { orderId }: { orderId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only Admin or QA can access assignments by order
      if (
        context.currentUser.role !== 'ADMIN' &&
        context.currentUser.role !== 'QA'
      ) {
        throw new Error('Only Admin or QA can access assignments by order')
      }

      const assignments = await context.prisma.assignment.findMany({
        where: { orderId },
        include: { order: true, writer: true },
      })

      if (assignments.length === 0) {
        throw new Error('No assignments found for this order')
      }

      return assignments
    },

    // Get assignments by writer
    assignmentsByWriter: async (
      _: unknown,
      { writerId }: { writerId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only Admin, QA, or the writer themselves can access assignments by writer
      if (
        context.currentUser.role !== 'ADMIN' &&
        context.currentUser.role !== 'QA' &&
        context.currentUser.id !== writerId
      ) {
        throw new Error('Unauthorized access to writer assignments')
      }

      const assignments = await context.prisma.assignment.findMany({
        where: { writerId },
        include: { order: true, writer: true },
      })

      if (assignments.length === 0) {
        throw new Error('No assignments found for this writer')
      }

      return assignments
    },
  },
  Mutation: {
    createAssignment: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          orderId: string
          writerId: string
        }
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only Admin or QA can assign orders
      if (
        context.currentUser.role !== 'ADMIN' &&
        context.currentUser.role !== 'QA'
      ) {
        throw new Error('Only Admin or QA can create assignments')
      }

      const assignment = await context.prisma.assignment.create({
        data: {
          orderId: input.orderId,
          writerId: input.writerId,
          status: 'PENDING',
        },
        include: { order: true },
      })

      return {
        success: true,
        message: 'Assignment created successfully.',
        assignment,
      }
    },

    updateAssignment: async (
      _: unknown,
      {
        assignmentId,
        data,
      }: {
        assignmentId: string
        data: Partial<Assignment>
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Fetch the assignment to verify ownership
      const assignment = await context.prisma.assignment.findUnique({
        where: { id: assignmentId },
      })

      if (!assignment) {
        throw new Error('Assignment not found')
      }

      if (assignment.writerId !== context.currentUser.id) {
        throw new Error('Unauthorized access to assignment')
      }

      // Proceed with the update
      const updatedAssignment = await context.prisma.assignment.update({
        where: { id: assignmentId },
        data,
      })

      return updatedAssignment
    },

    deleteAssignment: async (
      _: unknown,
      { assignmentId }: { assignmentId: string },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) throw new Error('Please login to continue')

      // Only Admin or QA can delete assignments
      if (
        context.currentUser.role !== 'ADMIN' &&
        context.currentUser.role !== 'QA'
      ) {
        throw new Error('Only Admin or QA can delete assignments')
      }

      // Fetch the assignment
      const assignment = await context.prisma.assignment.findUnique({
        where: { id: assignmentId },
      })

      if (!assignment) {
        throw new Error('Assignment not found')
      }

      // Proceed with the deletion
      const deletedAssignment = await context.prisma.assignment.delete({
        where: { id: assignmentId },
      })

      return deletedAssignment
    },
  },
  Assignment: {
    order: (parent: Assignment, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      })
    },
    writer: (parent: Assignment, _: unknown, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.writerId },
      })
    },
  },
}
