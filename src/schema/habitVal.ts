import {z} from 'zod';

export const CreateHabitVal = z.object({
    name: z.string()
        .trim()
        .min(3, "Mínimo de 3 letras para criar um hábito.")
        .max(50, "Máximo de 50 letras para nome do hábito."),
    description:  z.string()
        .max(250, "Máximo 250 caracteres.")
        .optional(),

    userId: z.cuid2("ID de usuário inválido."),
})

export const UpdateHabitVal = CreateHabitVal.partial();

export type CreateHabitInput = z.infer<typeof CreateHabitVal>;
export type UpdateHabitInput = z.infer<typeof UpdateHabitVal>;