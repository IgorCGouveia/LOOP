import { z } from 'zod';

export const HabitMetricsParamsVal = z.object({
    habitId: z.cuid2('ID de hábito inválido.'),
});

export type HabitMetricsParamsInput = z.infer<typeof HabitMetricsParamsVal>;