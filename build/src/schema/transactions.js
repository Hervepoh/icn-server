"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkDeleteSchema = exports.createSchema = exports.idSchema = exports.transactionSchema = void 0;
const zod_1 = require("zod");
const idSchema = zod_1.z.string().uuid();
exports.idSchema = idSchema;
const createSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Customer name is required')
        .max(100, { message: "Customer name Less than 100 caracters." })
        .regex(/^[a-zA-Z0-9\s\-\+\*\|\\_\#\&]+$/, { message: "The customer name can only contain letters, numbers, and spaces." }),
    amount: zod_1.z.number().positive(),
    bank: zod_1.z.string().uuid('Bank input format is not available'),
    payment_date: zod_1.z.string().min(1, "Payment date is required"),
    payment_mode: zod_1.z.string().uuid('Payment mode input format is not available'),
    description: zod_1.z.string().optional()
});
exports.createSchema = createSchema;
const updateSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Bank name is required')
        .max(100, { message: "Bank name Less than 100 caracters." })
        .regex(/^[a-zA-Z0-9\s\-\+\*\|\\_\#\&]+$/, { message: "The transaction name can only contain letters, numbers, and spaces." })
        .optional(),
    amount: zod_1.z.number().positive().optional(),
    bankId: zod_1.z.string().uuid().optional(),
    payment_mode: zod_1.z.string().uuid().optional(),
    payment_date: zod_1.z.date().optional(),
    status: zod_1.z.number().optional(),
    description: zod_1.z.string().optional()
});
const transactionSchema = zod_1.z.object({
    reference: zod_1.z.string().optional(),
    userId: zod_1.z.string().uuid(), // Assurez-vous que c'est un UUID
    name: zod_1.z.string()
        .min(1, 'Bank name is required')
        .max(100, { message: "Bank name Less than 100 caracters." })
        .regex(/^[a-zA-Z0-9\s\-\+\*\|\\_\#\&]+$/, { message: "The transaction name can only contain letters, numbers, space , dot and minus" }),
    amount: zod_1.z.number().positive(),
    bankId: zod_1.z.string().uuid('Bank name is required'),
    paymentDate: zod_1.z.date(),
    paymentModeId: zod_1.z.string().uuid(),
    statusId: zod_1.z.number(),
    validatorId: zod_1.z.string().uuid().optional(),
    createdBy: zod_1.z.string().optional(),
    modifiedBy: zod_1.z.string().optional(),
    description: zod_1.z.string().optional()
});
exports.transactionSchema = transactionSchema;
const transactionbulkSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(), // Assurez-vous que c'est un UUID
    name: zod_1.z.string()
        .min(1, 'Bank name is required')
        .max(100, { message: "Bank name Less than 100 caracters." })
        .regex(/^[a-zA-Z0-9\s\-\+\*\|\\_\#\&]+$/, { message: "The transaction name can only contain letters, numbers, and spaces." }),
    amount: zod_1.z.number().positive(),
    bankId: zod_1.z.string().uuid('Bank name is required'),
    paymentDate: zod_1.z.date(),
    description: zod_1.z.string().optional()
    // paymentModeId: z.string().uuid(),
});
// Define the schema for bulk create requests
// const bulkCreateSchema = z.array({
//   // data: z.object(transactionbulkSchema).min(1, { message: "At least one transaction must be provided." })
//   name: z.string(),
//   // .min(1, 'Bank name is required'),
//   // .max(100, { message: "Bank name Less than 100 caracters." })
//   // .regex(/^[a-zA-Z0-9\s]+$/, { message: "The transaction name can only contain letters, numbers, and spaces." }),
// amount: z.number().positive(),
// bankId: z.string().uuid('Bank name is required'),
// paymentDate: z.date(),
// });
// Define the schema for bulk delete requests
const bulkDeleteSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1, { message: "At least one ID must be provided." })
});
exports.bulkDeleteSchema = bulkDeleteSchema;
