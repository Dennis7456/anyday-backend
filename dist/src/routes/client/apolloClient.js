"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apolloClient = void 0;
const core_1 = require("@apollo/client/core");
exports.apolloClient = new core_1.ApolloClient({
    link: new core_1.HttpLink({ uri: 'http://localhost:8080/graphql' }),
    cache: new core_1.InMemoryCache(),
});
