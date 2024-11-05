import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('Stack Trace:', reason instanceof Error ? reason.stack : reason);
});


register('ts-node/esm', pathToFileURL('./'));
import('./app/index.ts');
