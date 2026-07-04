import { FastifyInstance } from "fastify";
import UserController from "../controllers/UserController";
import { Auth } from "../Middleware/Auth";

const userController = new UserController();

export async function userRoutes(server: FastifyInstance){



    server.post("/users", userController.CreateUser);

    server.get("/users", {preHandler: Auth}, userController.GetAll);

    server.put("/users/:id", {preHandler: Auth}, userController.update);

    server.delete("/users/:id", {preHandler: Auth}, userController.delUser);
}

