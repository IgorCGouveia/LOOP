import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../app";
import * as habitService from "../services/habitServices"
import { CreateHabitVal } from "../schema/habitVal";


export default class HabitController{

    constructor(){}

    async CreateHabit(req:FastifyRequest, res:FastifyReply){
        // const dados = req.body;
        // const newUser = await prisma.user.create({data: dados})
        // return res.status(201).send(newUser);
        //valida as entradas com o zod
        const data = CreateHabitVal.parse(req.body);

        //vai chamar o service para criar um usuario
        const NewHabit = await habitService.CreateHabit(data);

        return res.status(201).send(NewHabit);
    }





            async GetAllFromUser(req:FastifyRequest, res:FastifyReply){
                const {userId} = req.params as {userId:string};
                const habits = await habitService.GetAllHabitsFromUser(userId);
                return res.status(200).send(habits);
            
             }





            // async update(req:FastifyRequest, res:FastifyReply){
            //     // const {id } = req.params;
            //     // const dados = req.body;
            //     // const userATT = await prisma.user.update({where: {id: Number(id)}, data: dados});
            //     // return res.status(200).send(userATT);

            //     const { id } = req.params as {id: string};
                
            //     const data = UpdateUserVal.parse(req.body);

            //     if( Object.keys(data).length == 0){
            //         return res.status(400).send("Nenhum dado para atualizar foi fornecido");
            //     }

            //     const userUp = await userService.updateUser(id, data);

            //     return res.status(200).send(userUp);
            // }






            // async delUser(req:FastifyRequest, res:FastifyReply){
            //     const {id} = req.params as {id: string};
            //     const deletado = await prisma.user.delete({where: {id: Number(id)}});
            //     return res.status(200).send(deletado); 
            // }
        }

