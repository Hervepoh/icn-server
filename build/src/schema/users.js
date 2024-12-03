"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoleSchema = exports.updateSchema = exports.signUpSchema = exports.idSchema = void 0;
const zod_1 = require("zod");
const idSchema = zod_1.z.string().min(1).uuid();
exports.idSchema = idSchema;
const signUpSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    roleId: zod_1.z.string().optional()
});
exports.signUpSchema = signUpSchema;
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(6).optional(),
});
exports.updateSchema = updateSchema;
const userRoleSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "userId is required").uuid("userId input format is not available"),
    roleId: zod_1.z.string().min(1, "roleId is required").uuid("roleId input format is not available"),
});
exports.userRoleSchema = userRoleSchema;
