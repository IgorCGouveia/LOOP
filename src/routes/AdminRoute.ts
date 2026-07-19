import { FastifyInstance } from 'fastify';
import { Auth } from '../Middleware/Auth';
import AdminController from '../controllers/AdminController';

const adminController = new AdminController();

export async function adminRoutes(server: FastifyInstance) {
    server.get('/admin/stats', { preHandler: Auth }, adminController.GetStats);
}