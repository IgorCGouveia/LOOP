import 'dotenv/config'
import Fastify from "fastify"
import {userRoutes} from './routes/UserRoute';
import { PrismaClient } from '@prisma/client';

//inicia o fastify com logging
export const server = Fastify({
    logger: true
})

//instância global do Prisma Client(instância unica)
//pooling
export const prisma = new PrismaClient();

server.register(userRoutes);

server.listen({port: 3333}).then(() => {
    console.log("Server está rodando na porta 3333")
})
