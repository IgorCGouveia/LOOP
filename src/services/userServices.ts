import argon2 from "argon2";
import { prisma } from "../app";
import { CreateUserInput, UpdateUserInput } from "../schema/userVal";


export async function createuser(data: CreateUserInput){
    try{
        const hash = await argon2.hash(data.password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1,
        });

        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hash,
            },
        });
        return user;
    }catch(err){
        throw err;
    }
}

export async function getAllusers(){
    const users = await prisma.user.findMany({
        orderBy: { id: "asc" }
    });
    return users;
}

export async function updateUser(id: string, data: UpdateUserInput){
    const payload: any = {};
    if(data.name !== undefined) payload.name = data.name;
    if(data.email !== undefined) payload.email = data.email;
    if(data.password !== undefined){
        payload.password = await argon2.hash(data.password, {
            type: argon2.argon2id,
            memoryCost: 2**16,
            timeCost: 3,
            parallelism: 1,

        });
    }
    
    
    const user = await prisma.user.update({
        where: {id},
        data: payload,
    });
    return user;
}



export async function delUser(id: string){
    const deleted = await prisma.user.delete({
        where: { id },
    });
    return deleted;
}