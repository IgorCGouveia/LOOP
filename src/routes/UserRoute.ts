import { FastifyInstance } from "fastify";
import { CreateUser, Read } from '../controllers/UserController';

export async function userRoutes(server: FastifyInstance){


    server.post("/users", CreateUser);

    server.get("/users", Read)
}

