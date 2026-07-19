import { prisma } from '../app';

async function ensureUserExists(userId: string) {
    const exist = await prisma.user.findUnique({ where: { id: userId } });
    if (!exist) {
        throw new Error('Usuário não encontrado.');
    }
    return exist;
}

async function ensureHabitExists(habitId: string) {
    const exist = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!exist) {
        throw new Error('Hábito não encontrado.');
    }
    return exist;
}

async function ensureHabitBelongsToUser(habitId: string, userId: string) {
    const habit = await ensureHabitExists(habitId);
    if (habit.userId !== userId) {
        throw new Error('Você não tem permissão para registrar este hábito.');
    }
    return habit;
}

export async function CreateHabitLog(habitId: string, userId: string) {
    await ensureUserExists(userId);
    await ensureHabitBelongsToUser(habitId, userId);

    const habitLog = await (prisma as any).habitLog.create({
        data: {
            habitId,
            userId,
        },
    });

    return habitLog;
}

function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function toDayKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDayKey(dayKey: string) {
    const [year, month, day] = dayKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function calculateStreaks(completedAtDates: Date[]) {
    const uniqueDays = Array.from(new Set(completedAtDates.map(toDayKey))).sort();

    if (uniqueDays.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
    }

    let bestStreak = 1;
    let currentRun = 1;
    let currentStreak = 1;

    for (let index = 1; index < uniqueDays.length; index += 1) {
        const previousDay = parseDayKey(uniqueDays[index - 1]);
        const currentDay = parseDayKey(uniqueDays[index]);
        const diffInDays = Math.round((currentDay.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 1) {
            currentRun += 1;
        } else {
            bestStreak = Math.max(bestStreak, currentRun);
            currentRun = 1;
        }
    }

    bestStreak = Math.max(bestStreak, currentRun);

    const todayKey = toDayKey(new Date());
    let streakEndingToday = 0;
    let cursor = uniqueDays.length - 1;

    if (uniqueDays[cursor] === todayKey) {
        streakEndingToday = 1;
        while (cursor > 0) {
            const previousDay = parseDayKey(uniqueDays[cursor - 1]);
            const currentDay = parseDayKey(uniqueDays[cursor]);
            const diffInDays = Math.round((currentDay.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24));

            if (diffInDays !== 1) {
                break;
            }

            streakEndingToday += 1;
            cursor -= 1;
        }
    }

    currentStreak = streakEndingToday;

    return { currentStreak, bestStreak };
}

export async function GetHabitMetrics(habitId: string, userId: string) {
    await ensureUserExists(userId);
    await ensureHabitBelongsToUser(habitId, userId);

    const habitLogClient = prisma as any;

    const todayStart = startOfDay(new Date());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [totalCompletions, completionsLast7Days, habitLogs] = await Promise.all([
        habitLogClient.habitLog.count({
            where: { habitId, userId },
        }),
        habitLogClient.habitLog.count({
            where: {
                habitId,
                userId,
                completedAt: {
                    gte: sevenDaysAgo,
                },
            },
        }),
        habitLogClient.habitLog.findMany({
            where: { habitId, userId },
            orderBy: { completedAt: 'asc' },
            select: { completedAt: true },
        }),
    ]);

    const completedAtDates: Date[] = habitLogs.map((log: { completedAt: Date }) => log.completedAt);
    const { currentStreak, bestStreak } = calculateStreaks(completedAtDates);

    return {
        habitId,
        totalCompletions,
        completionsLast7Days,
        currentStreak,
        bestStreak,
    };
}

export async function GetHabitLogs(habitId: string, userId: string) {
    await ensureUserExists(userId);
    await ensureHabitBelongsToUser(habitId, userId);

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