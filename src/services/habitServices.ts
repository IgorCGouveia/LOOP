import prismaConfig from '../../prisma.config';
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