import {z} from 'zod';

export const CreateUserVal = z.object({
    name: z.string()
        .min(3, 'Nome é obrigatório')
        .max(50, 'Maximo 50 caracteres'),
    email: z.email({message: 'Formato de email inválido.'}),
    password: z
        .string()
        .min(8)
        .max(128),
        
    confirmPassword:z
        .string()
        .min(8),
})
.refine(
    (data) =>   data.confirmPassword == data.password,
    "As senhas não coincidem"
);

export const UpdateUserVal = CreateUserVal.partial()

export type CreateUserInput = z.infer<typeof CreateUserVal>;
export type UpdateUserInput = z.infer<typeof UpdateUserVal>;