"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const users = [
    {
        id: '1',
        firstName: 'Maurice',
        lastName: 'Moss',
        email: 'maurice@moss.com',
        password: 'abcdefg'
    },
    {
        id: '2',
        firstName: 'Roy',
        lastName: 'Trenneman',
        email: 'roy@trenneman.com',
        password: 'imroy'
    }
];
exports.default = {
    getUsers: () => users
    // addUser: (user) => users.push(user),
};
