import ca from "zod/v4/locales/ca.js";
import { prisma } from "../app";
import { CreateUserInput, UpdateUserInput } from "../schema/userVal";


export async function createuser(data: CreateUserInput){
    try{
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password,
            },
        });
        return user;
    }catch{}
}

export async function getAllusers(){
    const users = await prisma.user.findMany({
        orderBy: { id: "asc" }
    });
    return users;
}

export async function updateUser(id: string, data: UpdateUserInput){
    const user = await prisma.user.update({
        where: {id},
        data: {
            name: data.name,
            email: data.email,
            password: data.password,
        }
    });
    return user;
}



export async function delUser(id: string){
    await prisma.user.delete({
        where: { id },
    });
    
}