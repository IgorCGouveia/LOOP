import { prisma } from '../app';
import { FindHabit } from './habitServices';
import * as checkinRepository from '../repositories/checkinRepository';
import type { Habit } from '../generated/prisma/client';

const GRACE_TOKENS_CAP = 3;

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
function recalculateLongestStreak(datesAsc: Date[]): { length: number; startDate: Date | null } {
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

// meses corridos (UTC) entre duas datas — usado só pra saber quantas
// reposições de grace token (+1/mês, calendário fixo) já eram devidas.
function monthsElapsedUTC(from: Date, to: Date): number {
    return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

async function replenishGraceTokens(habit: Habit): Promise<number> {
    const now = new Date();
    const elapsed = monthsElapsedUTC(habit.graceTokensUpdatedAt, now);

    if (elapsed <= 0) {
        return habit.graceTokens;
    }

    const newBalance = Math.min(habit.graceTokens + elapsed, GRACE_TOKENS_CAP);
    await prisma.habit.update({
        where: { id: habit.id },
        data: { graceTokens: newBalance, graceTokensUpdatedAt: now },
    });

    return newBalance;
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

    const datesAscBefore = await checkinRepository.getEffectiveLog(habitId);
    const lastDate = datesAscBefore[datesAscBefore.length - 1] ?? null;

    let graceTokens = await replenishGraceTokens(habit);

    // gap de exatamente 1 dia (hoje = último dia + 2) consome 1 token,
    // gravando o dia pulado em GraceFill pra ele contar como contíguo
    // em qualquer recálculo futuro. Gap maior não é perdoável.
    const isOneDayGap = lastDate !== null && addDays(lastDate, 2).getTime() === today.getTime();

    if (isOneDayGap && graceTokens > 0) {
        await checkinRepository.insertGraceFill(habitId, addDays(lastDate!, 1));
        graceTokens -= 1;
        await prisma.habit.update({ where: { id: habitId }, data: { graceTokens } });
    }

    const checkin = await checkinRepository.insertCheckIn(habitId, today);

    const datesAsc = await checkinRepository.getEffectiveLog(habitId);
    const tail = computeTailStreak([...datesAsc].reverse());
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

    return { checkin, currentStreak, longestStreak, graceTokens };
}

export async function UndoCheckIn(habitId: string) {
    const habit = await FindHabit(habitId);
    if (!habit) {
        return null;
    }

    const lastLog = await checkinRepository.findMostRecentCheckIn(habitId);
    if (!lastLog) {
        return null;
    }

    const tailBefore = computeTailStreak([...(await checkinRepository.getEffectiveLog(habitId))].reverse());
    const undoAffectsRecord =
        habit.longestStreakStartDate !== null &&
        tailBefore.startDate !== null &&
        tailBefore.startDate.getTime() === habit.longestStreakStartDate.getTime();

    await checkinRepository.deleteCheckIn(lastLog.id);

    const currentStreak = computeTailStreak(
        [...(await checkinRepository.getEffectiveLog(habitId))].reverse(),
    ).length;

    let longestStreak = habit.longestStreak;
    let longestStreakStartDate = habit.longestStreakStartDate;

    if (undoAffectsRecord) {
        const recalculated = recalculateLongestStreak(await checkinRepository.getEffectiveLog(habitId));
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
    return checkinRepository.findCheckInsByHabit(habitId);
}

export async function GetCheckInsByUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return null;
    }

    return checkinRepository.findCheckInsByUser(userId);
}
