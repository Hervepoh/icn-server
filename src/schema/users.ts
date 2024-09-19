import { z } from 'zod'

const signUpSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6)
})

const userRoleSchema = z.object({
    userId: z.string().min(1, "userId is required").uuid("userId input format is not available"),
    roleId: z.string().min(1, "roleId is required").uuid("roleId input format is not available"),
})

export { signUpSchema, userRoleSchema }