"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionResolvers = exports.EVENTS = exports.pubsub = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const graphql_subscriptions_2 = require("graphql-subscriptions");
// Create a new PubSub instance with proper type definition
// Use a type assertion to tell TypeScript that this PubSub instance has the asyncIterator method
exports.pubsub = new graphql_subscriptions_1.PubSub();
// Define subscription event names
exports.EVENTS = {
    MESSAGE_ADDED: 'MESSAGE_ADDED',
    CHAT_ADDED: 'CHAT_ADDED',
};
// Define subscription resolvers
exports.subscriptionResolvers = {
    Subscription: {
        messageAdded: {
            subscribe: (0, graphql_subscriptions_2.withFilter)(() => exports.pubsub.asyncIterator([exports.EVENTS.MESSAGE_ADDED]), (payload, variables) => {
                // Only push an update if the message is for the chat the client is subscribed to
                if (!payload || !payload.messageAdded || !variables)
                    return false;
                return payload.messageAdded.chatId === variables.chatId;
            }),
        },
        chatAdded: {
            subscribe: (0, graphql_subscriptions_2.withFilter)(() => exports.pubsub.asyncIterator([exports.EVENTS.CHAT_ADDED]), (payload, variables) => {
                // Only push an update if the user is a participant in the chat
                if (!payload || !payload.chatAdded || !variables)
                    return false;
                return payload.chatAdded.participants.some((participant) => participant.id === variables.userId);
            }),
        },
    },
};
