import { z } from 'zod'

const idSchema = z.string().min(1).uuid();

const signUpSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    roleId: z.string().optional()
})

const updateSchema = z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
})

const userRoleSchema = z.object({
    userId: z.string().min(1, "userId is required").uuid("userId input format is not available"),
    roleId: z.string().min(1, "roleId is required").uuid("roleId input format is not available"),
})

export { idSchema, signUpSchema,updateSchema, userRoleSchema }