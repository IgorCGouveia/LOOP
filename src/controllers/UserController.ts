import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { DiffieHellmanGroup } from "node:crypto";

const prisma = new PrismaClient();

export default class UserController{

    constructor(){}

    async CreateUser(req:FastifyRequest<{Body: Prisma.UserCreateInput}>, res:FastifyReply){
        const dados = req.body;
        const newUser = await prisma.user.create({data: dados})
        return res.status(201).send(newUser);
    }
    async Read(req:FastifyRequest, res:FastifyReply){
        const users = await prisma.user.findMany();
        return res.status(200).send(users);
    
    }
    async update(req:FastifyRequest<{Params: {id:string}, Body:Prisma.UserUpdateInput }>, res:FastifyReply){
        const {id } = req.params;
        const dados = req.body;
        const userATT = await prisma.user.update({where: {id: Number(id)}, data: dados});
        return res.status(200).send(userATT);
    }

    async delUser(req:FastifyRequest<{Params: {id:string}}>, res:FastifyReply){
        const {id} = req.params;
        const deletado = await prisma.user.delete({where: {id: Number(id)}});
        return res.status(200).send(deletado); 
    }
}

