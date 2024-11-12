/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest",{}],
    // "\\.graphql$": "jest-transform-graphql"
  },
  testMatch: [
    "**/__test__/**/*.test.ts"
  ],
  moduleFileExtensions: ["ts", "tsx", "js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "./dist",
    "graphql"

  ],
  moduleNameMapper: {
    "\\.graphql$": "<rootDir>/__mocks__/graphqlMock.js"
  }
};