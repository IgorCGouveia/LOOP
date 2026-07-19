import { prisma } from '../app';

function toDayKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function getSystemStats() {
    const habitLogClient = prisma as any;

    const [usersCount, habitsCount, logsCount, roleBreakdown, logs] = await Promise.all([
        prisma.user.count(),
        prisma.habit.count(),
        habitLogClient.habitLog.count(),
        prisma.user.groupBy({
            by: ['role'],
            _count: { _all: true },
        }),
        habitLogClient.habitLog.findMany({
            select: { completedAt: true },
            orderBy: { completedAt: 'desc' },
        }),
    ]);

    const logsByDay = logs.reduce((accumulator: Record<string, number>, log: { completedAt: Date }) => {
        const key = toDayKey(log.completedAt);
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
    }, {} as Record<string, number>);

    const recentDays = Object.entries(logsByDay)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-7)
        .map(([day, count]) => ({ day, count }));

    return {
        usersCount,
        habitsCount,
        logsCount,
        roleBreakdown,
        recentDays,
    };
}