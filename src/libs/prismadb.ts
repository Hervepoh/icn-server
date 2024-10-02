// Documentation : https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prismaclient-in-long-running-applications
import { PrismaClient } from "@prisma/client"
import { signUpSchema } from "../schema/users";

const globalForPrisma = globalThis as unknown as { prismaClient: PrismaClient }

const prismaClient = globalForPrisma.prismaClient || new PrismaClient({
    log: [
        // { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
    ],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaClient = prismaClient


export default prismaClient
