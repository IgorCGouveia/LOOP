import { FastifyRequest, FastifyReply } from "fastify"
import { ZodError } from "zod"
import { Prisma } from "../generated/prisma";

export function errorHandler(error:Error, req: FastifyRequest, res: FastifyReply){

    if(error instanceof ZodError){
        const issues = error.issues.map((issue) => ({
            campo: issue.path.join("."),
            message: issue.message,
        }));
        return res.status(400).send(issues);
    }

    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"){
        return res.status(409).send({message: "Email já cadastrado."});
    }

    return res.status(500).send({ statusCode: 500, error: "Internal Server Error", message: error.message });
}