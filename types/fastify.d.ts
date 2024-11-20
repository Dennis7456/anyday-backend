import { User } from "@prisma/client";
import { FastifyRequest } from "fastify";

declare module "fastify" {
  // Extending FastifyRequest interface to include user and rawBody properties
  interface FastifyRequest {
    user?: User;
    rawBody?: string | Buffer;
  }
}
