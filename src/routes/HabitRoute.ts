import { FastifyInstance } from "fastify";
import UserController from "../controllers/UserController";

const userController = new UserController();

export async function userRoutes(server: FastifyInstance){



    server.post("/users", userController.CreateUser);

    server.get("/users", userController.GetAll);

    server.put("/users/:id", userController.update);

    server.delete("/users/:id",userController.delUser);
}

