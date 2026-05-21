import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Prisma } from "../generated/prisma/client";


const prisma = new PrismaClient();

export async function CreateUser(req:FastifyRequest<{Body: Prisma.UserCreateInput}>,res:FastifyReply){
    const dado = req.body;
    const newUser = await prisma.user.create({data: dado});
    return res.status(201).send(newUser);
}