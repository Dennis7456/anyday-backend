import type  {Config} from "@jest/types";

const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
        // "^.+\\.graphql$": "jest-transform-graphql",
    },
    moduleFileExtensions: ["ts", "tsx", "js", "graphql"]
}

export default config;