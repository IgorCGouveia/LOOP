import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';

const argon2Mock = vi.hoisted(() => ({
    hash: vi.fn(),
    verify: vi.fn(),
}));

const jwtMock = vi.hoisted(() => ({
    sign: vi.fn(),
    verify: vi.fn(),
}));

vi.mock('argon2', () => ({
    default: argon2Mock,
    __esModule: true,
}));

vi.mock('jsonwebtoken', () => ({
    default: jwtMock,
    __esModule: true,
}));

import { server, prisma } from '../src/app';

process.env.SECRET_KEY = 'test-secret';

beforeAll(async () => {
    await server.ready();
});

beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_KEY = 'test-secret';
});

afterAll(async () => {
    await server.close();
});

describe('Loop API', () => {
    it('cria um usuário', async () => {
        const createSpy = vi.spyOn(prisma.user, 'create').mockResolvedValue({
            id: 'user1user1user1user1user1',
            email: 'alice@example.com',
            name: 'Alice',
            role: 'USER',
        } as any);

        (argon2Mock.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-password');

        const response = await server.inject({
            method: 'POST',
            url: '/users',
            payload: {
                name: 'Alice',
                email: 'alice@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            },
        });

        expect(response.statusCode).toBe(201);
        expect(createSpy).toHaveBeenCalledWith({
            data: {
                name: 'Alice',
                email: 'alice@example.com',
                password: 'hashed-password',
            },
            select: { id: true, email: true, name: true, role: true },
        });
        expect(response.json()).toMatchObject({
            id: 'user1user1user1user1user1',
            email: 'alice@example.com',
            name: 'Alice',
            role: 'USER',
        });
    });

    it('faz login e devolve token', async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
            id: 'user1user1user1user1user1',
            email: 'alice@example.com',
            password: 'hashed-password',
            name: 'Alice',
            role: 'USER',
        } as any);

        (argon2Mock.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (jwtMock.sign as ReturnType<typeof vi.fn>).mockReturnValue('token-123');

        const response = await server.inject({
            method: 'POST',
            url: '/login',
            payload: {
                email: 'alice@example.com',
                password: 'password123',
            },
        });

        expect(response.statusCode).toBe(200);
        expect(jwtMock.sign).toHaveBeenCalledWith(
            { id: 'user1user1user1user1user1', role: 'USER' },
            'test-secret',
            { expiresIn: '1h' },
        );
        expect(response.json()).toMatchObject({
            accessToken: 'token-123',
            name: 'Alice',
            id: 'user1user1user1user1user1',
            role: 'USER',
        });
    });

    it('cria um hábito autenticado', async () => {
        (jwtMock.verify as ReturnType<typeof vi.fn>).mockReturnValue({
            id: 'user1user1user1user1user1',
            role: 'USER',
        });

        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
            id: 'user1user1user1user1user1',
            email: 'alice@example.com',
            password: 'hashed-password',
            name: 'Alice',
            role: 'USER',
        } as any);

        const createSpy = vi.spyOn(prisma.habit, 'create').mockResolvedValue({
            id: 'habit1habit1habit1habit1',
            name: 'Run',
            description: 'Morning run',
            userId: 'user1user1user1user1user1',
            createdAt: new Date('2026-07-19T10:00:00.000Z'),
            updatedAt: new Date('2026-07-19T10:00:00.000Z'),
        } as any);

        const response = await server.inject({
            method: 'POST',
            url: '/habits',
            headers: {
                authorization: 'Bearer token-123',
            },
            payload: {
                name: 'Run',
                description: 'Morning run',
            },
        });

        expect(response.statusCode).toBe(201);
        expect(createSpy).toHaveBeenCalledWith({
            data: {
                name: 'Run',
                description: 'Morning run',
                userId: 'user1user1user1user1user1',
            },
        });
    });

    it('cria um HabitLog para um hábito do usuário', async () => {
        (jwtMock.verify as ReturnType<typeof vi.fn>).mockReturnValue({
            id: 'user1user1user1user1user1',
            role: 'USER',
        });

        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
            id: 'user1user1user1user1user1',
            email: 'alice@example.com',
            password: 'hashed-password',
            name: 'Alice',
            role: 'USER',
        } as any);

        vi.spyOn(prisma.habit, 'findUnique').mockResolvedValue({
            id: 'habit1habit1habit1habit1',
            name: 'Run',
            description: 'Morning run',
            userId: 'user1user1user1user1user1',
            createdAt: new Date('2026-07-19T10:00:00.000Z'),
            updatedAt: new Date('2026-07-19T10:00:00.000Z'),
        } as any);

        const createSpy = vi.spyOn((prisma as any).habitLog, 'create').mockResolvedValue({
            id: 'log1log1log1log1log1log1',
            habitId: 'habit1habit1habit1habit1',
            userId: 'user1user1user1user1user1',
            completedAt: new Date('2026-07-19T12:00:00.000Z'),
        });

        const response = await server.inject({
            method: 'POST',
            url: '/habits/habit1habit1habit1habit1/logs',
            headers: {
                authorization: 'Bearer token-123',
            },
        });

        expect(response.statusCode).toBe(201);
        expect(createSpy).toHaveBeenCalledWith({
            data: {
                habitId: 'habit1habit1habit1habit1',
                userId: 'user1user1user1user1user1',
            },
        });
    });

    it('bloqueia usuário comum de listar todos os hábitos', async () => {
        (jwtMock.verify as ReturnType<typeof vi.fn>).mockReturnValue({
            id: 'user1user1user1user1user1',
            role: 'USER',
        });

        const response = await server.inject({
            method: 'GET',
            url: '/habits',
            headers: {
                authorization: 'Bearer token-123',
            },
        });

        expect(response.statusCode).toBe(403);
    });

    it('permite ADMIN listar todos os hábitos', async () => {
        (jwtMock.verify as ReturnType<typeof vi.fn>).mockReturnValue({
            id: 'admin1admin1admin1admin1',
            role: 'ADMIN',
        });

        const findManySpy = vi.spyOn(prisma.habit, 'findMany').mockResolvedValue([
            {
                id: 'habit-1',
                name: 'Run',
                description: 'Morning run',
                userId: 'user-1',
                createdAt: new Date('2026-07-19T10:00:00.000Z'),
                updatedAt: new Date('2026-07-19T10:00:00.000Z'),
            },
        ] as any);

        const response = await server.inject({
            method: 'GET',
            url: '/habits',
            headers: {
                authorization: 'Bearer token-123',
            },
        });

        expect(response.statusCode).toBe(200);
        expect(findManySpy).toHaveBeenCalledWith({
            orderBy: { name: 'asc' },
        });
        expect(response.json()).toHaveLength(1);
    });
});