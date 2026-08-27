import { prisma } from '../app';

// Único módulo que toca prisma.habitLog/prisma.graceFill — enforced por
// src/__tests__/checkinRepositoryBoundary.test.ts. Streak depende do
// merge de check-ins reais + dias perdoados; centralizar aqui evita que
// uma feature futura leia só HabitLog e mostre histórico incompleto.

export async function insertCheckIn(habitId: string, date: Date) {
    return prisma.habitLog.create({ data: { habitId, date } });
}

export async function findMostRecentCheckIn(habitId: string) {
    return prisma.habitLog.findFirst({
        where: { habitId },
        orderBy: { checkedAt: 'desc' },
    });
}

export async function deleteCheckIn(id: string) {
    return prisma.habitLog.delete({ where: { id } });
}

export async function findCheckInsByHabit(habitId: string) {
    return prisma.habitLog.findMany({
        where: { habitId },
        orderBy: { date: 'desc' },
    });
}

export async function findCheckInsByUser(userId: string) {
    return prisma.habitLog.findMany({
        where: { habit: { userId } },
        orderBy: { date: 'desc' },
    });
}

export async function insertGraceFill(habitId: string, date: Date) {
    return prisma.graceFill.create({ data: { habitId, date } });
}

/**
 * Lista, em ordem ascendente e sem duplicata, todos os dias que contam
 * pro cálculo de streak de um hábito — união de check-ins reais
 * (`HabitLog`) com dias perdoados por token (`GraceFill`). Ordem sempre
 * `asc`; quem precisar de `desc` (ex: `computeTailStreak`) inverte no
 * chamador.
 */
export async function getEffectiveLog(habitId: string): Promise<Date[]> {
    const [realLogs, graceFills] = await Promise.all([
        prisma.habitLog.findMany({
            where: { habitId },
            select: { date: true },
            distinct: ['date'],
        }),
        prisma.graceFill.findMany({
            where: { habitId },
            select: { date: true },
        }),
    ]);

    const uniqueDates = new Map<number, Date>();
    for (const log of realLogs) {
        uniqueDates.set(log.date.getTime(), log.date);
    }
    for (const fill of graceFills) {
        uniqueDates.set(fill.date.getTime(), fill.date);
    }

    return Array.from(uniqueDates.values()).sort((a, b) => a.getTime() - b.getTime());
}
