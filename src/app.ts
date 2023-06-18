import { fastify } from "fastify";

const buildServer = (opts = {}) => {
  const app = fastify(opts);

  app.get("/", async function (request, reply) {
    return { hello: "world" };
  });

  return app;
};

export default buildServer;