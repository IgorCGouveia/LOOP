import '../controllers/UserController';
import { CreateUser } from "../controllers/UserController";
import { FastifyInstance } from "fastify";

export async function userRoutes(server: FastifyInstance){


    server.post("/users", CreateUser);

    
}

