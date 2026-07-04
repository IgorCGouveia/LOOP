import 'dotenv/config'
import Fastify from "fastify"
import {userRoutes} from './routes/UserRoute';
import { PrismaClient } from './generated/prisma/client';
import { habitRoutes } from './routes/HabitRoute';
import { LoginRoute } from './routes/indexRoute';

//inicia o fastify com logging
export const server = Fastify({
    logger: true
})

//instância global do Prisma Client(instância unica)
//pooling
//vai ser usado na camada de services para comunicar com o banco
export const prisma = new PrismaClient();

server.register(userRoutes);
server.register(habitRoutes);
server.register(LoginRoute)

server.listen({port: 3333}).then(() => {
    console.log("Server está rodando na porta 3333")
})
