import { prisma } from '../app';
import { FindHabit } from './habitServices';

function getDateOnlyInTimezone(instant: Date, timezone: string): Date {
    const formatted = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(instant);

    return new Date(`${formatted}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function isNextDay(earlier: Date, later: Date): boolean {
    return addDays(earlier, 1).getTime() === later.getTime();
}

async function getDistinctDatesDesc(habitId: string): Promise<Date[]> {
    const logs = await prisma.habitLog.findMany({
        where: { habitId },
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' },
    });
    return logs.map((log) => log.date);
}

// streak atual: sem janela fixa, conta a sequência contígua mais recente
// (a "cauda" das datas distintas), pare no primeiro gap.
function computeTailStreak(datesDesc: Date[]): { length: number; startDate: Date | null } {
    if (datesDesc.length === 0) {
        return { length: 0, startDate: null };
    }

    let length = 1;
    let startDate = datesDesc[0];

    for (let i = 1; i < datesDesc.length; i++) {
        if (isNextDay(datesDesc[i], datesDesc[i - 1])) {
            length++;
            startDate = datesDesc[i];
        } else {
            break;
        }
    }

    return { length, startDate };
}

// recorde histórico: varre o log inteiro. Só é chamado quando um undo
// mexe na sequência que hoje detém o longestStreak (ver docs/problems).
async function recalculateLongestStreak(habitId: string): Promise<{ length: number; startDate: Date | null }> {
    const logs = await prisma.habitLog.findMany({
        where: { habitId },
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'asc' },
    });
    const datesAsc = logs.map((log) => log.date);

    if (datesAsc.length === 0) {
        return { length: 0, startDate: null };
    }

    let longest = 1;
    let longestStart = datesAsc[0];
    let runLength = 1;
    let runStart = datesAsc[0];

    for (let i = 1; i < datesAsc.length; i++) {
        if (isNextDay(datesAsc[i - 1], datesAsc[i])) {
            runLength++;
        } else {
            runLength = 1;
            runStart = datesAsc[i];
        }

        if (runLength > longest) {
            longest = runLength;
            longestStart = runStart;
        }
    }

    return { length: longest, startDate: longestStart };
}

export async function CreateCheckIn(habitId: string, ownerId: string) {
    const habit = await FindHabit(habitId);
    if (!habit) {
        return null;
    }

    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
        return null;
    }

    const today = getDateOnlyInTimezone(new Date(), owner.timezone);

    const checkin = await prisma.habitLog.create({
        data: { habitId, date: today },
    });

    const datesDesc = await getDistinctDatesDesc(habitId);
    const tail = computeTailStreak(datesDesc);
    const currentStreak = tail.length;

    let longestStreak = habit.longestStreak;
    let longestStreakStartDate = habit.longestStreakStartDate;

    if (currentStreak > habit.longestStreak) {
        longestStreak = currentStreak;
        longestStreakStartDate = tail.startDate;

        await prisma.habit.update({
            where: { id: habitId },
            data: { longestStreak, longestStreakStartDate },
        });
    }

    return { checkin, currentStreak, longestStreak };
}

export async function UndoCheckIn(habitId: string) {
    const habit = await FindHabit(habitId);
    if (!habit) {
        return null;
    }

    const lastLog = await prisma.habitLog.findFirst({
        where: { habitId },
        orderBy: { checkedAt: 'desc' },
    });

    if (!lastLog) {
        return null;
    }

    const tailBefore = computeTailStreak(await getDistinctDatesDesc(habitId));
    const undoAffectsRecord =
        habit.longestStreakStartDate !== null &&
        tailBefore.startDate !== null &&
        tailBefore.startDate.getTime() === habit.longestStreakStartDate.getTime();

    await prisma.habitLog.delete({ where: { id: lastLog.id } });

    const currentStreak = computeTailStreak(await getDistinctDatesDesc(habitId)).length;

    let longestStreak = habit.longestStreak;
    let longestStreakStartDate = habit.longestStreakStartDate;

    if (undoAffectsRecord) {
        const recalculated = await recalculateLongestStreak(habitId);
        longestStreak = recalculated.length;
        longestStreakStartDate = recalculated.startDate;

        await prisma.habit.update({
            where: { id: habitId },
            data: { longestStreak, longestStreakStartDate },
        });
    }

    return { currentStreak, longestStreak };
}

export async function GetCheckInsByHabit(habitId: string) {
    return prisma.habitLog.findMany({
        where: { habitId },
        orderBy: { date: 'desc' },
    });
}

export async function GetCheckInsByUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return null;
    }

    return prisma.habitLog.findMany({
        where: { habit: { userId } },
        orderBy: { date: 'desc' },
    });
}
