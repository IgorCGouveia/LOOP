import 'dotenv/config'
import Fastify from "fastify"
import {userRoutes} from './routes/UserRoute';

//inicia o fastify com logging
export const server = Fastify({
    logger: true
})

server.register(userRoutes);

server.listen({port: 3333}).then(() => {
    console.log("Server está rodando na porta 3333")
})
