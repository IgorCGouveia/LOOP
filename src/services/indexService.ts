import argon2  from 'argon2';
import {prisma} from '../app';
import jwt from 'jsonwebtoken';

export async function Logar(email: string, password: string){
    const User = await prisma.user.findUnique({
        where: {email}
    })
    if(!User){
        return null
    }
    const verificada = await argon2.verify(User.password, password);
    if(verificada){

        const payload = {
            id: User.id,
            role: User.role,
        };

        const secretKey = process.env.SECRET_KEY

        if(secretKey){
            const Auth =  {
                accessToken: jwt.sign(payload, secretKey, {expiresIn: '1h'}),
                expiresIn: "1 hora",
                name: User.name,
                id: User.id,
                role: User.role
            };

            return Auth;
        }else{
            throw new Error("Nao existe Secret Key");
        }   
    }else{
        return null;
    }


}