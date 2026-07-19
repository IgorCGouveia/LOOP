import { z } from 'zod';

export const CreateHabitLogVal = z.object({
    habitId: z.cuid2('ID de hábito inválido.'),
});

export type CreateHabitLogInput = z.infer<typeof CreateHabitLogVal>;