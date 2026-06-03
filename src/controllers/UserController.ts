import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../app";
import { CreateUserSchema } from "../schema/userVal";
import * as userService from "../services/userServices"


export default class UserController{

    constructor(){}

    async CreateUser(req:FastifyRequest, res:FastifyReply){
        // const dados = req.body;
        // const newUser = await prisma.user.create({data: dados})
        // return res.status(201).send(newUser);
        //valida as entradas com o zod
        const data = CreateUserSchema.parse(req.body);

        //vai chamar o service para criar um usuario
        const Newuser = userService.createuser(data);

        return res.status(201).send(Newuser)
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

