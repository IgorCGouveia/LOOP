import { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

declare module "fastify" {
    interface FastifyRequest {
        user: {
            id: string;
            role: string;
        };
    }
}

type TokenPayload = {
    id: string;
    role: string;
};



export async function Auth(req: FastifyRequest){
    const bearer = req.headers.authorization;

    if(!bearer){
        throw new Error("Token nao informado");
    }

    const token = bearer.split(" ")[1];

    if(!token){
        throw new Error("Formato do token inválido");
    }

    const secretKey = process.env.SECRET_KEY;

    if(!secretKey){
        throw new Error("Sem chave secreta");
    }
    const autenticado = jwt.verify(token, secretKey) as TokenPayload;

    
        req.user = {
            id: autenticado.id,
            role: autenticado.role
        }
    
}