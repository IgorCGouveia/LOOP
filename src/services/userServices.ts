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