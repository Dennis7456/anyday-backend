import { createRequire } from 'module';
import { loadSchemaSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';

const require = createRequire(import.meta.url);

export function resolve(specifier, context, defaultResolve) {
    if (specifier.endsWith('.graphql')) {
        return {
            url: new URL(specifier, context.parentURL).href,
            format: 'module',
            shortCircuit: true,  // Add this line to indicate completion
        };
    }
    return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
    if (url.endsWith('.graphql')) {
        const schema = loadSchemaSync(url.slice(7), {
            loaders: [new GraphQLFileLoader()],
        });
        return {
            format: 'module',
            source: `export default ${JSON.stringify(schema)}`,
            shortCircuit: true,  // Add this line to indicate completion
        };
    }
    return defaultLoad(url, context, defaultLoad);
}
