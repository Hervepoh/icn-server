"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idSchema = exports.notificationSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const notificationSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    method: zod_1.z.enum([client_1.NotificationMethod.EMAIL, client_1.NotificationMethod.WHATSAPP, client_1.NotificationMethod.INTERN, client_1.NotificationMethod.AVAILABLE]),
    subject: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    template: zod_1.z.string().min(1),
});
exports.notificationSchema = notificationSchema;
const idSchema = zod_1.z.number();
exports.idSchema = idSchema;
