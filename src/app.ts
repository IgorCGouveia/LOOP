import 'dotenv/config'
import Fastify from "fastify"
import { ZodError } from 'zod';
import {userRoutes} from './routes/UserRoute';
import { PrismaClient } from './generated/prisma/client';
import { habitRoutes } from './routes/HabitRoute';
import { LoginRoute } from './routes/indexRoute';

//instância global do Prisma Client(instância unica)
//pooling
//vai ser usado na camada de services para comunicar com o banco
export const prisma = new PrismaClient();



export function buildApp(){


    //inicia o fastify com logging
     const server = Fastify({logger: true});
    server.register(userRoutes);
    server.register(habitRoutes);
    server.register(LoginRoute);

    server.setErrorHandler((error: Error,req,res) => {
        if(error instanceof ZodError){
            const erro = error.issues.map(issue=> ({
                campo: issue.path.join("."),
                message: issue.message
            }));
            res.status(400).send(erro);
        }else{
            res.status(500).send({statusCode: 500, error: "Internal Server Error", message: error.message})
        }

    })
    return server;
}
