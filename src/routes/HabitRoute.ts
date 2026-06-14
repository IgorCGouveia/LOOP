import { FastifyInstance } from "fastify";
import HabitController from "../controllers/HabitController";

const habitController = new HabitController();

export async function habitRoutes(server: FastifyInstance){



    server.post("/habits", habitController.CreateHabit);

    server.get("/users/:userId/habits", habitController.GetAllFromUser);

    server.get("/habits", habitController.GetAllHabits);

    server.put("/habits/:id", habitController.UpdateHabit);

    server.delete("/habits/:id",habitController.DeleteHabit);
}

