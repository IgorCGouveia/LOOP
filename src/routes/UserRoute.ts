import { FastifyInstance } from "fastify";
import UserController from "../controllers/UserController";
import Auth from "../Middleware/Auth";

const userController = new UserController();
const auth = new Auth();
export async function userRoutes(server: FastifyInstance){



    server.post("/users", userController.CreateUser);

    server.get("/users", {preHandler: auth.admin}, userController.GetAll);

    server.put("/users/:id", {preHandler: auth.user}, userController.update);

    server.delete("/users/:id", {preHandler: auth.user}, userController.delUser);
}

