import { FastifyInstance } from "fastify";
import HabitController from "../controllers/HabitController";

const habitController = new HabitController();

export async function habitRoutes(server: FastifyInstance){



    server.post("/habits", habitController.CreateHabit);

    // server.get("/users", userController.GetAll);

    // server.put("/users/:id", userController.update);

    // server.delete("/users/:id",userController.delUser);
}

