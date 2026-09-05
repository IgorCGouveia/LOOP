import { buildApp } from "./app";

const server = buildApp();

const port = Number(process.env.PORT) || 3333;
const host = process.env.HOST || "0.0.0.0";

server.listen({ port, host }).catch((err) => {
    server.log.error(err);
    process.exit(1);
});
