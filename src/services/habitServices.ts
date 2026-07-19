import {prisma } from '../app';
import {CreateHabitInput, UpdateHabitInput} from  '../schema/habitVal'


async function ensureUserExists(userId: string)
{
    const exist = await prisma.user.findUnique({where: {id: userId}});
    if(!exist){
        throw new Error("Usuário não encontrado.");
    }
    return exist;
}

async function ensureHabitExists(id: string){
    const exist = await prisma.habit.findUnique({where: {id}})
    if(!exist){
        throw new Error("Hábito não encontrado.");

    }
    return exist;

}

async function ensureHabitOwnedByUser(habitId: string, userId: string) {
    const habit = await ensureHabitExists(habitId);
    if (habit.userId !== userId) {
        throw new Error("Você não tem permissão para alterar este hábito.");
    }
    return habit;
}

export async function CreateHabit(data: CreateHabitInput)
{
    await ensureUserExists(data.userId);

    const habit = await prisma.habit.create({
        data: {
            name: data.name,
            description: data.description,
            userId: data.userId
        },
    });

    return habit;
}

export async function GetAllHabitsFromUser(userId: string){

    await ensureUserExists(userId);
    
    const habits = await prisma.habit.findMany({
        where: {userId: userId},
        orderBy: {name: 'asc'},

    });

    return habits;
}

export async function GetAllHabits(){

    const habits = await prisma.habit.findMany({
        orderBy:{ name: 'asc'}
    });

    return habits;
}

export async function UpdateHabit(id: string,data: UpdateHabitInput){

    await ensureHabitExists(id);

    const updated = await prisma.habit.update({where: {id}, data})

    return updated;

}


export async function DeleteHabit(id: string){

    await ensureHabitExists(id);

    const deleted = await prisma.habit.delete({where: {id}})

    return deleted;
}

export async function GetHabitLogs(habitId: string, userId: string) {
    await ensureHabitOwnedByUser(habitId, userId);

    const habitLogClient = prisma as any;

    const logs = await habitLogClient.habitLog.findMany({
        where: { habitId, userId },
        orderBy: { completedAt: 'desc' },
        select: {
            id: true,
            habitId: true,
            userId: true,
            completedAt: true,
        },
    });

    return logs;
}

export async function ensureHabitCanBeEdited(habitId: string, userId: string) {
    return ensureHabitOwnedByUser(habitId, userId);
}