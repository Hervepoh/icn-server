"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Documentation : https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prismaclient-in-long-running-applications
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
const prismaClient = globalForPrisma.prismaClient || new client_1.PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
    ],
});
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prismaClient = prismaClient;
exports.default = prismaClient;
