import { PubSub } from 'graphql-subscriptions'
import { withFilter } from 'graphql-subscriptions'

// Create a new PubSub instance with proper type definition
// Use a type assertion to tell TypeScript that this PubSub instance has the asyncIterator method
export const pubsub = new PubSub() as PubSub & {
  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T>
}

// Define subscription event names
export const EVENTS = {
  MESSAGE_ADDED: 'MESSAGE_ADDED',
  CHAT_ADDED: 'CHAT_ADDED',
}

// Define types for payload and variables
interface MessageAddedPayload {
  messageAdded: {
    id: string
    chatId: string
    content: string
    senderId: string
    createdAt: string
    isRead: boolean
  }
}

interface ChatAddedPayload {
  chatAdded: {
    id: string
    orderId: string
    participants: Array<{
      id: string
      firstName?: string
      lastName?: string
    }>
  }
}

interface MessageAddedVariables {
  chatId: string
}

interface ChatAddedVariables {
  userId: string
}

// Define subscription resolvers
export const subscriptionResolvers = {
  Subscription: {
    messageAdded: {
      subscribe: withFilter<MessageAddedPayload, MessageAddedVariables>(
        () => pubsub.asyncIterator([EVENTS.MESSAGE_ADDED]),
        (payload, variables) => {
          // Only push an update if the message is for the chat the client is subscribed to
          if (!payload || !payload.messageAdded || !variables) return false
          return payload.messageAdded.chatId === variables.chatId
        }
      ),
    },
    chatAdded: {
      subscribe: withFilter<ChatAddedPayload, ChatAddedVariables>(
        () => pubsub.asyncIterator([EVENTS.CHAT_ADDED]),
        (payload, variables) => {
          // Only push an update if the user is a participant in the chat
          if (!payload || !payload.chatAdded || !variables) return false
          return payload.chatAdded.participants.some(
            (participant) => participant.id === variables.userId
          )
        }
      ),
    },
  },
}
