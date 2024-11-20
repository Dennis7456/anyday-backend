import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
        // '^.+\\.cjs$': 'babel-jest'
        // "^.+\\.graphql$": "jest-transform-graphql",
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1', // Adjust based on your project structure
    },
    moduleFileExtensions: ["ts", "tsx", "js", "graphql"],
    // transformIgnorePatterns: [
    //     '/node_modules/(?!intl-messageformat|konva|intl-messageformat-parser|node-fetch|d3-hierarchy|@apollo).+\\.(js|cjs)$',
    // ],
}

export default config;