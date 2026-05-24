import { FastifyInstance } from "fastify";
import { CreateUser, deleteUser, Read, update } from '../controllers/UserController';

export async function userRoutes(server: FastifyInstance){


    server.post("/users", CreateUser);

    server.get("/users", Read);

    server.put("/users/:id", update);

    server.delete("/users/:id",deleteUser);
}

