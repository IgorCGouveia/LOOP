import { buildApp } from "./app";

const server = buildApp();

server.listen({port: 3333}).then(() => {
    console.log("Server está rodando na porta 3333")
})
