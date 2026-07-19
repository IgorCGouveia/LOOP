import { FastifyInstance } from "fastify";
import HabitController from "../controllers/HabitController";
import { Auth } from "../Middleware/Auth";

const habitController = new HabitController();

export async function habitRoutes(server: FastifyInstance){



    server.post("/habits", {preHandler: Auth}, habitController.CreateHabit);

    server.get("/me/habits", {preHandler: Auth}, habitController.GetMyHabits);

    server.get("/users/:userId/habits", {preHandler: Auth}, habitController.GetAllFromUser);

    server.get("/habits", {preHandler: Auth}, habitController.GetAllHabits);

    server.put("/habits/:id", {preHandler: Auth}, habitController.UpdateHabit);

    server.delete("/habits/:id", {preHandler: Auth}, habitController.DeleteHabit);
}

