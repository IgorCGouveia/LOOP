import { FastifyRequest, FastifyReply, } from "fastify";
import { PrismaClient, Prisma } from "../generated/prisma/client";


const prisma = new PrismaClient();

export async function CreateUser(req:FastifyRequest<{Body: Prisma.UserCreateInput}>,res:FastifyReply){
    const dado = req.body;
    const newUser = await prisma.user.create({data: dado});
    return res.status(201).send(newUser);
}

export  async function Read(req:FastifyRequest, res:FastifyReply){
    const users = await prisma.user.findMany();
    return res.status(200).send(users);
}

export async function update(req:FastifyRequest<{Params: { id: string}, Body: Prisma.UserUpdateInput}>, res:FastifyReply){
    const {id} = req.params;

    const upUser = await prisma.user.update({where: {id: Number(id)}, data: req.body})

    return res.status(200).send(upUser)
}