import { z } from 'zod';

const idSchema = z.string().uuid();

const createSchema = z.object({
  name: z.string()
    .min(1, 'Customer name is required')
    .max(100, { message: "Customer name Less than 100 caracters." })
    .regex(/^[a-zA-Z0-9\s]+$/, { message: "The customer name can only contain letters, numbers, and spaces." }),
  amount: z.number().positive(),
  bank: z.string().uuid('Bank input format is not available'),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.string().uuid('Payment mode input format is not available'),
});


const transactionSchema = z.object({
  reference: z.string().optional(),
  userId: z.string().uuid(), // Assurez-vous que c'est un UUID
  name: z.string()
    .min(1, 'Bank name is required')
    .max(100, { message: "Bank name Less than 100 caracters." })
    .regex(/^[a-zA-Z0-9\s]+$/, { message: "The transaction name can only contain letters, numbers, and spaces." }),
  amount: z.number().positive(),
  bankId: z.string().uuid('Bank name is required'),
  paymentDate: z.date(),
  paymentModeId: z.string().uuid(),
  statusId: z.string().uuid(),
  validatorId: z.string().uuid().optional(),
  createdBy: z.string().optional(),
  modifiedBy: z.string().optional(),
});

// Define the schema for bulk create requests
const bulkCreateSchema = z.object({
  data: z.array(transactionSchema).min(1, { message: "At least one transaction must be provided." })
});

// Define the schema for bulk delete requests
const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, { message: "At least one ID must be provided." })
});

// Export the schemas
export { transactionSchema, idSchema, createSchema, bulkCreateSchema, bulkDeleteSchema };