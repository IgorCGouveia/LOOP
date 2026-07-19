import { FastifyInstance } from 'fastify';
import { Auth } from '../Middleware/Auth';
import HabitLogController from '../controllers/HabitLogController';

const habitLogController = new HabitLogController();

export async function habitLogRoutes(server: FastifyInstance) {
    server.post('/habits/:habitId/logs', { preHandler: Auth }, habitLogController.CreateHabitLog);
    server.get('/habits/:habitId/metrics', { preHandler: Auth }, habitLogController.GetHabitMetrics);
    server.get('/habits/:habitId/logs', { preHandler: Auth }, habitLogController.GetHabitLogs);
}