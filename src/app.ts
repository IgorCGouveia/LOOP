import Fastify from "fastify"

//inicia o fastify com logging
export const server = Fastify({
    logger: true
})

import './routes/UserRoute';

server.listen({port: 5432}).then(() => {
    console.log("Server está rodando na porta 5432")
})
