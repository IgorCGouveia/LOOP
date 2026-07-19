import { FastifyReply, FastifyRequest } from 'fastify';
import { getSystemStats } from '../services/adminServices';

export default class AdminController {
    async GetStats(req: FastifyRequest, res: FastifyReply) {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).send('Você não tem permissão para acessar esta área.');
        }

        const stats = await getSystemStats();
        return res.status(200).send(stats);
    }
}