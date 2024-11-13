// import {
//     getGraphQLParameters,
//     processRequest,
//     Request,
//     sendResult,
//     shouldRenderGraphiQL,
//     renderGraphiQL,
//   } from 'graphql-helix';
//   import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
//   import { schema } from '../schema';
// import { contextFactory } from '../context/context';

//   // Define and export the route as a function
//   export function registerGraphQLRoute(server: FastifyInstance) {
//     server.route({
//       method: ['POST', 'GET'],
//       url: '/graphql',
//       handler: async (req: FastifyRequest, reply: FastifyReply) => {
//         const request: Request = {
//           headers: req.headers,
//           method: req.method,
//           query: req.query,
//           body: req.body,
//         };

//         if (shouldRenderGraphiQL(request)) {
//           const responseBody = renderGraphiQL({ endpoint: '/graphql' });
//           reply.header('Content-Type', 'text/html');
//           reply.status(200).send(responseBody);
//           return;
//         }

//         const { operationName, query, variables } = getGraphQLParameters(request);

//         const result = await processRequest({
//           request,
//           schema,
//           operationName,
//           contextFactory: () => contextFactory(req),
//           query,
//           variables,
//         });

//         sendResult(result, reply.raw);
//       },
//     });
//   }
