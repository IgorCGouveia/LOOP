import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateHabitLogVal } from '../schema/habitLogVal';
import { HabitMetricsParamsVal } from '../schema/habitMetricsVal';
import * as habitLogService from '../services/habitLogServices';

export default class HabitLogController {
    async CreateHabitLog(req: FastifyRequest, res: FastifyReply) {
        const { habitId } = req.params as { habitId: string };
        const userId = req.user.id;

        const data = CreateHabitLogVal.parse({ habitId });

        const habitLog = await habitLogService.CreateHabitLog(data.habitId, userId);

        return res.status(201).send(habitLog);
    }

    async GetHabitMetrics(req: FastifyRequest, res: FastifyReply) {
        const params = HabitMetricsParamsVal.parse(req.params);
        const userId = req.user.id;

        const metrics = await habitLogService.GetHabitMetrics(params.habitId, userId);

        return res.status(200).send(metrics);
    }

    async GetHabitLogs(req: FastifyRequest, res: FastifyReply) {
        const { habitId } = req.params as { habitId: string };
        const userId = req.user.id;

        const logs = await habitLogService.GetHabitLogs(habitId, userId);

        return res.status(200).send(logs);
    }
}