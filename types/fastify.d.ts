<<<<<<< HEAD
import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        rawBody?: Buffer;
    }
=======
import { User } from "@prisma/client";
import { FastifyRequest } from "fastify";

declare module "fastify" {
  // Extending FastifyRequest interface to include user and rawBody properties
  interface FastifyRequest {
    user?: User;
    rawBody?: string | Buffer;
  }
>>>>>>> 3fea0d7e858df9d3f6133c23db4c1902201d1535
}
