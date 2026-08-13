import {prisma } from '../app';
import {CreateHabitInput, UpdateHabitInput} from  '../schema/habitVal'


async function ensureUserExists(userId: string)
{
    const exist = await prisma.user.findUnique({where: {id: userId}});
    if(!exist){
        return null
    }
    return exist;
}

async function ensureHabitExists(id: string){
    const exist = await prisma.habit.findUnique({where: {id}})
    if(!exist){
        return null

    }
    return exist;

}

export async function FindHabit(id: string) {

    const exist = await prisma.habit.findUnique({where: {id}})

    if(!exist){
        return null;
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

    const user = await ensureUserExists(userId);
    if(!user){
        return null
    }
    
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