declare module '@fastify/multipart' {
  import { FastifyPluginCallback } from 'fastify';

  const multipart: FastifyPluginCallback;

  export default multipart;
}