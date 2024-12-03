import { NextFunction, Request, Response } from "express";

import { redis } from "../libs/utils/redis";
import prismaClient from "../libs/prismadb";
import { getCurrentMonthYear, parseDMY } from "../libs/utils/formatter";
import { createSchema, idSchema, transactionSchema } from "../schema/transactions";
import UnauthorizedException from "../exceptions/unauthorized";
import BadRequestException from "../exceptions/bad-requests";
import { ErrorCode } from "../exceptions/http-exception";
import { appConfig } from "../config/app.config";
import { REDIS_SESSION_EXPIRE } from "../secrets";
// import { bulkCreateSchema } from "../schema/transactions";
import ConfigurationException from "../exceptions/configuration";
import NotFoundException from "../exceptions/not-found";
import { getUserConnected } from "../libs/authentificationService";
import { NotificationMethod, SourceType, Transaction } from '@prisma/client';
import { EventType } from "../constants/enum";

interface TransactionWithRelations extends Transaction {
  bank?: {
    name: string;
  };
  paymentMode?: {
    name: string;
  };
  unit?: {
    name: string;
  };
  region?: {
    name: string;
  };
  status?: {
    name: string;
  };
  user?: {
    name: string;
  };
  validator?: {
    name: string;
  }
  creator?: {
    name: string;
  }
  modifier?: {
    name: string;
  }
}

const key = 'transactions';
type notificationType = "edit" | "publish" | "reject" | "validate" | "assign" | "treat";
//-----------------------------------------------------------------------------
//             CREATE TRANSACTIONS : post /transactions
//-----------------------------------------------------------------------------

// ITransactionRequest
interface ITransactionRequest {
  name: string;
  amount: number;
  bank: string;
  payment_date: Date;
  payment_mode: string;
  description?: string
}

// Handling create process
export const create =
  async (req: Request, res: Response, next: NextFunction) => {

    // Validate input
    const parsedTransaction = createSchema.parse(req.body as ITransactionRequest);

    const user = await getUserConnected(req);

    const status = await prismaClient.status.findFirst({ where: { name: 'draft' } })

    const transaction = await prismaClient.transaction.create({
      data: {
        name: parsedTransaction.name,
        amount: parsedTransaction.amount,
        bankId: parsedTransaction.bank,
        description: parsedTransaction.description,
        statusId: status?.id,
        paymentModeId: parsedTransaction.payment_mode,
        paymentDate: parseDMY(parsedTransaction.payment_date),
        createdBy: user.id,
        modifiedBy: user?.id,
        userId: user?.id
      },
    });
    revalidateService(key);

    res.status(201).json({
      success: true,
      data: transaction,
    });

    // User notification by mail
    await prismaClient.notification.create({
      data: {
        email: user.email,
        message: `A new transaction has been created with the following details :     - **Status** : Draft ,   - **Customer** : ${transaction.name} , - **Amount** : ${transaction.amount} , - **Payment Date** : ${transaction.paymentDate} . Please review the transaction at your earliest convenience.`,
        method: NotificationMethod.EMAIL,
        subject: "New transaction have been created successfully.",
        template: "notification.mail.ejs",
      },
    });

    // Audit entry for tracking purpose
    await prismaClient.audit.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        action: EventType.TRANSACTION,
        details: `User : ${user.email} created new Transaction : ${JSON.stringify(transaction)}`,
        endpoint: '/transactions',
        source: SourceType.USER
      },
    });


  };


//-----------------------------------------------------------------------------
//             GET ALL TRANSACTIONS :  get /transactions
//-----------------------------------------------------------------------------

// Handling get process   
export const get =
  async (req: Request, res: Response, next: NextFunction) => {

    const soft = req.user?.role.name !== "ADMIN" ? { deleted: false } : {};
    let query: any = {
      include: {
        bank: {
          select: {
            name: true,
          },
        },
        paymentMode: {
          select: {
            name: true,
          },
        },
        status: {
          select: {
            name: true,
          },
        },
        unit: {
          select: {
            name: true,
          },
        },
        region: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        validator: {
          select: {
            name: true,
          },
        },
        creator: {
          select: {
            name: true,
          },
        },
        modifier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    };

    // Extracting the status filter from the request query
    const { status } = req.query;

    if (status) {
      const validStatus = await prismaClient.status.findFirst({
        where: { name: status.toString() },
      });

      if (!validStatus) throw new BadRequestException('Invalid status filter', ErrorCode.INVALID_DATA);

      query = {
        where: { statusId: validStatus.id },
        ...query
      }

    };

    const { userId } = req.query
    if (userId) {
      const validUserId = await prismaClient.user.findFirst({
        where: { id: userId.toString() },
      });

      if (!validUserId) throw new BadRequestException('Invalid status filter', ErrorCode.INVALID_DATA);
      query = {
        where: { userId: validUserId.id },
        ...query
      }
    };

    if (soft) {
      query = {
        where: soft,
        ...query
      }
    }

    const transactions = await prismaClient.transaction.findMany(query) as TransactionWithRelations[];

    const result = transactions.map((item) => ({
      ...item,
      status: item?.status?.name,
      bank: item?.bank?.name,
      unit: item?.unit?.name,
      region: item?.region?.name,
      payment_mode: item?.paymentMode?.name,
      payment_date: item?.paymentDate,
      assignTo: item?.user?.name,
      validatedBy: item?.validator?.name,
      modifiedBy: item?.modifier?.name,
      createdBy: item?.creator?.name,
      createdById: item?.createdBy
    }));
    revalidateService(key);

    return res.status(200).json({
      success: true,
      data: result,
    });
  };


//-----------------------------------------------------------------------------
//             GET TRANSACTIONS BY ID : get /transactions/:id
//-----------------------------------------------------------------------------

// Handling the process GET transaction by ID 
export const getById =
  async (req: Request, res: Response, next: NextFunction) => {

    const id = req.params.id;
    if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

    let data;
    // check if the provided id is in the cache
    const isCachedExist = await redis.get(id);
    if (isCachedExist) {
      data = JSON.parse(isCachedExist);
    } else {
      data = idService(id);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        amount: data.amount.toString(),
      }
    });
  };

//-----------------------------------------------------------------------------
//             UPDATE ROLE : put  /transactions/:id
//-----------------------------------------------------------------------------

// Handling Update transaction process
export const update =
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

    const validatedId = idSchema.parse(id);
    let notificationType: notificationType = "edit";

    // Check body request params for security purposes
    const forbiddenFields = [
      'createdAt', 'createdBy',
      'modifiedBy', 'deleted', 'deletedBy',
      'deletedAt'
    ];

    for (const field of forbiddenFields) {
      if (req.body[field]) {
        throw new UnauthorizedException("Unauthorized resource", ErrorCode.UNAUTHORIZE);
      }
    }

    // get the user information
    const user = await prismaClient.user.findFirst({
      where: { id: req.user?.id },
    });
    if (!user) throw new UnauthorizedException("Unauthorize ressource", ErrorCode.UNAUTHORIZE);


    let data: any = {};

    if (req.body.name) {
      data.name = req.body.name
    };

    if (req.body.amount) {
      data.amount = req.body.amount
    };

    if (req.body.bank) {
      data.bankId = req.body.bank
    };

    if (req.body.payment_mode) {
      data.paymentModeId = req.body.payment_mode
    };

    if (req.body.payment_date) {
      data.paymentDate = new Date(req.body.payment_date)
    }

    if (req.body.description) {
      data.description = req.body.description
    }

    if (req.body.userId) {
      const user = await prismaClient.user.findFirst({
        where: { id: req.body.userId },
      });
      if (!user) throw new BadRequestException("Bad request unvalidate userId", ErrorCode.UNAUTHORIZE);
      data.userId = user.id
    }

    if (req.body.regionId) {
      const region = await prismaClient.region.findFirst({
        where: { id: req.body.regionId },
      });
      if (!region) throw new BadRequestException("Bad request unvalidate regionId", ErrorCode.UNAUTHORIZE);
      data.regionId = region.id
    }

    if (req.body.unitId) {
      const unit = await prismaClient.unit.findFirst({
        where: { id: req.body.unitId },
      });
      if (!unit) throw new BadRequestException("Bad request unvalidate unitId", ErrorCode.UNAUTHORIZE);
      data.unitId = unit.id
    }


    if (req.body.status) {
      const status = await prismaClient.status.findFirst({
        where: { name: req.body.status },
      });
      if (!status) throw new UnauthorizedException("Unauthorize ressource", ErrorCode.UNAUTHORIZE);

      data.statusId = parseInt(status.id.toString());

      // For publish the request  (status === draft)
      if (req.body.status.toLocaleLowerCase() === appConfig.status[2].toLocaleLowerCase()) {
        const request = await prismaClient.transaction.findFirst({
          where: { id: id }
        });

        if (!request?.reference && request?.paymentDate && request?.bankId) {
          const refId = await generateICNRef(request.paymentDate, request.bankId);
          data.reference = refId.reference
        }
        notificationType = "publish"
      }

      // For validation
      if (req.body.status.toLocaleLowerCase() === appConfig.status[3].toLocaleLowerCase()) {
        data.validatorId = user.id;
        data.validatedAt = new Date();
        notificationType = "validate"
      }

      // For Reject
      if (req.body.status.toLocaleLowerCase() === appConfig.status[4].toLocaleLowerCase()) {
        data.validatorId = user.id;
        data.validatedAt = new Date();
        data.refusal = true;
        data.reasonForRefusal = req.body.reasonForRefusal;
        notificationType = "reject"
      }

      // For Assignation
      if (req.body.status.toLocaleLowerCase() === appConfig.status[5].toLocaleLowerCase()) {
        data.assignBy = user.id;
        data.assignAt = new Date();
        if ((data.unitId || data.regionId) && !data.userId) {
          data.userId = null
        }

        notificationType = "assign"
      }

    }

    data = {
      ...data,
      modifiedBy: user.id,
      updatedAt: new Date()
    }

    const result = await prismaClient.transaction.update({
      where: { id: id },
      data: data,
    });

    idService(id);
    revalidateService(key);

    res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: result,
    });

    // Notification for all type of event
    notification(notificationType, result, user)

    // Audit entry for tracking purpose
    await prismaClient.audit.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        action: EventType.TRANSACTION,
        details: `User: ${user.email} has updated the transaction with ID: ${JSON.stringify(id)}. change value: ${JSON.stringify(data)}`,
        endpoint: '/transactions',
        source: SourceType.USER
      },
    });
  };


//-----------------------------------------------------------------------------
//             DELETE TRANSACTIONS : delete  /transactions/:id
//-----------------------------------------------------------------------------

// Handling delete process
export const remove =
  async (req: Request, res: Response, next: NextFunction) => {
    let id = req.params.id;

    if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

    id = idSchema.parse(id);

    await prismaClient.transaction.delete({
      where: { id: id },
    });
    await redis.del(id);
    revalidateService(key);

    res.status(204).send();

    const user = await getUserConnected(req);
    // Audit entry for tracking purpose
    await prismaClient.audit.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        action: EventType.TRANSACTION,
        details: `User : ${user.email} has deleted Transaction : ${JSON.stringify(id)}`,
        endpoint: '/transactions',
        source: SourceType.USER
      },
    });
  };


//-----------------------------------------------------------------------------
//             SOFT-DELETE TRANSACTIONS : delete  /transactions/:id
//-----------------------------------------------------------------------------

// Handling delete process
export const softRemove =
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

    const request = await prismaClient.transaction.findUnique({
      where: { id: idSchema.parse(id) },
    });
    if (!request) throw new NotFoundException("ressource not found", ErrorCode.RESSOURCE_NOT_FOUND);

    // get the user information
    const user = await prismaClient.user.findFirst({
      where: { id: req.user?.id },
    });
    if (!user) throw new UnauthorizedException("Unauthorize ressource", ErrorCode.UNAUTHORIZE);


    await prismaClient.transaction.update({
      where: { id: id },
      data: {
        deleted: true,
        deletedBy: user.id,
        deletedAt: new Date(),
      },
    });

    await redis.del(id);
    revalidateService(key);

    res.status(204).send();

    // Audit entry for tracking purpose
    await prismaClient.audit.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        action: EventType.TRANSACTION,
        details: `User : ${user.email} has deleted Transaction : ${JSON.stringify(id)}`,
        endpoint: '/transactions',
        source: SourceType.USER
      },
    });

  };




//-----------------------------------------------------------------------------
//             BULK-CREATE TRANSACTIONS : post /transactions/bluk
//-----------------------------------------------------------------------------

// IBulkCreateRequest interface definition
interface IBulkCreateRequest {
  data: { name: string }[];
}

// Handling create role process
export const bulkCreate =
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate that the request body is an array
    const requests = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      throw new BadRequestException("Request body must be a non-empty array", ErrorCode.INVALID_DATA);
    }

    // const parsedData = bulkCreateSchema.parse(req.body as IBulkCreateRequest);
    // get the user information
    const user = await prismaClient.user.findFirst({
      where: { id: req.user?.id },
    });
    if (!user) throw new UnauthorizedException("Unauthorize ressource", ErrorCode.UNAUTHORIZE);



    const validRequests = [];
    // Validate each request
    for (const requestData of requests) {
      const { name, amount, bank, mode, payment_date } = requestData;
      // Validate required fields for each request
      if (!name || !amount || !bank || !payment_date) {
        throw new BadRequestException("All fields (payment_date, name, amount, bank) are required for each request", ErrorCode.INVALID_DATA);
      }

      const bankData = await prismaClient.bank.findFirst({
        where: { id: bank }
      });
      if (!bankData) throw new ConfigurationException("bankData not found, please contact adminstrator", ErrorCode.BAD_CONFIGURATION);

      const payMode = await prismaClient.paymentMode.findFirst({
        where: { id: mode }
      });
      if (!payMode) throw new ConfigurationException("Payment mode not found, please contact adminstrator", ErrorCode.BAD_CONFIGURATION);

      // Generate a unique reference if it's not provided
      // const uniqueReference = await generateICNRef(parseDMY(payment_date));
      const data = transactionSchema.parse({
        // reference: uniqueReference.reference,
        name,
        amount,
        bankId: bankData.id,
        paymentDate: parseDMY(payment_date),
        paymentModeId: payMode.id,
        createdBy: user.id,
        modifiedBy: user.id,
        userId: user.id,
        statusId: 2

      })
      validRequests.push(data);
    }

    // Insert all valid requests into the database
    const createdRequests = await prismaClient.transaction.createMany({ data: validRequests });

    res.status(201).json({
      success: true,
      //data: createdRequests,
    });

  };


//---------------------------------------------------------
//            SOFT BULK DELETE REQUEST
//---------------------------------------------------------

// Handling soft delete process
export const bulkSoftRemove =
  async (req: Request, res: Response, next: NextFunction) => {

    let ids = req.body.ids; // Supposons que les IDs sont passés dans le corps de la requête

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Invalid params: IDs are required', ErrorCode.INVALID_DATA);
    }

    ids = ids.map((id: string) => idSchema.parse(id));

    // Vérifiez si les requêtes existent
    const requests = await prismaClient.transaction.findMany({
      where: { id: { in: ids } },
    });

    if (requests.length !== ids.length) {
      throw new NotFoundException('Invalid params: Some transactions not found', ErrorCode.INVALID_DATA);
    }

    // Supprimez les transactions en masse
    await prismaClient.transaction.deleteMany({
      where: { id: { in: ids } },
    });

    // Supprimez les entrées correspondantes du cache Redis
    await Promise.all(ids.map((item: string) => redis.del(item)));

    return res.status(200).json({
      success: true,
      message: "Transactions deleted successfully",
    });

  }


//-----------------------------------------------------------------------------
//             QUALITY CONTROLE :  /transactions/:id/quality
//-----------------------------------------------------------------------------

export const qualityAssurance =
  async (req: Request, res: Response, next: NextFunction) => {

    // Retrieve the transaction ID from request parameters
    const id = req.params.id;
    if (!id) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

    // Fetch the transaction based on the provided ID
    const transaction = await prismaClient.transaction.findUnique({
      where: { id: id },
    });
    if (!transaction) throw new BadRequestException('Invalid params', ErrorCode.INVALID_DATA)

    // Check if the transaction status allows further action
    if (transaction.statusId !== 6) {
      return res.status(200).json({
        success: true,
        quality_assurance: false,
        message: "No action available on this transaction",
      });
    }

    // Fetch the user making the request
    const user = await prismaClient.user.findFirst({
      where: { id: req.user?.id },
    });
    if (!user) throw new UnauthorizedException("UNAUTHORIZE", ErrorCode.UNAUTHORIZE);

    // Check if the transaction is locked by another user
    const lock = await prismaClient.transactionTempUser.findFirst({ where: { transactionId: id } });
    if (lock && lock.userId !== user.id) {
      // Fetch the email of the user who has locked the transaction
      const lockUser = await prismaClient.user.findUnique({
        where: { id: lock.userId },
        select: { email: true },
      });
      return res.status(200).json({
        success: true,
        quality_assurance: false,
        message: `This transaction is currently being processed by another user. You cannot edit it until the user: ${lockUser?.email} completes their task.`,
      });
    }

    // Fetch the selected invoices related to the transaction
    const invoices = await prismaClient.transactionDetail.findMany({
      where: { transactionId: id, selected: true },
    });

    // Calculate the total amount to be paid based on the selected invoices
    const newTotalToPaid = invoices.reduce((acc, cur) => acc + cur.amountTopaid, 0);
    if (newTotalToPaid !== transaction.amount) {
      return res.status(200).json({
        success: true,
        quality_assurance: false,
        message: "The amount you are attempting to pay does not match the amount specified in the ACI.",
      });
    }

    // Track duplicates using a Map for efficient lookup
    const invoiceMap = new Map<string, boolean>();
    const duplicates: string[] = [];

    // Check for duplicate invoices
    invoices.forEach(row => {
      const key = `${row.contract}-${row.invoice}`;
      if (invoiceMap.has(key)) {
        duplicates.push(`Bill: ${row.invoice}, Contract: ${row.contract}`);
      } else {
        invoiceMap.set(key, true);
      }
    });

    // If duplicates are found, return a message
    if (duplicates.length > 0) {
      return res.status(200).json({
        success: true,
        quality_assurance: false,
        message: `You have duplicate invoices: ${duplicates.join(', ')}`,
      });
    }

    // Raw SQL query to check for invoices already used in other transactions
    const result: any = await prismaClient.$queryRawUnsafe(`
      SELECT 
        td.invoice,
        td.transactionId,
        t.reference,
        t.statusId,
        COUNT(*) AS transaction_count
      FROM 
        transaction_details td
      JOIN 
        transactions t ON td.transactionId = t.id
      JOIN 
        (SELECT invoice FROM transaction_details WHERE transactionId = ? AND selected = 1) sub ON td.invoice = sub.invoice
      WHERE 
        td.transactionId <> ? AND t.statusId <> 6
      GROUP BY 
        td.invoice, td.transactionId, t.reference, t.statusId;
  `, id, id);

    // If already used invoices are found, return a message
    if (result.length > 0) {
      const alreadyUsed = result.map((row: { invoice: any; reference: any; }) => `Bill: ${row.invoice} already used in ACI: ${row.reference}`).join(', ');
      return res.status(200).json({
        success: true,
        quality_assurance: false,
        message: `${alreadyUsed}`,
      });
    }

    // If all checks pass, return success
    return res.status(200).json({
      success: true,
      quality_assurance: true,
      message: 'ok',
    });

  };




const idService = async (id: string) => {
  const data = await prismaClient.transaction.findUnique({
    where: { id: id },
    include: { bank: true, paymentMode: true }
  });

  // Put into Redis for caching futur purpose
  await redis.set(
    id,
    JSON.stringify(data),
    "EX",
    REDIS_SESSION_EXPIRE
  );

  return data
}

const revalidateService = async (key: string) => {
  const data = await prismaClient.transaction.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
  await redis.set(key, JSON.stringify(data));
  return data
}

/**
 * The function `generateICNRef` generates a new reference based on the current date and the last
 * reference in the database collection.
 * @param {Date} date - The `generateICNRef` function is designed to generate a new reference based on
 * the provided date. It retrieves the last reference from a database collection, extracts the sequence
 * number from it, increments the sequence number, and creates a new reference using the current month
 * and year along with the updated sequence
 * @returns The `generateICNRef` function returns a new ICN reference number that is generated based on
 * the current date and the last reference number stored in the database. The function first retrieves
 * the last reference number from the database, then calculates a new reference number by incrementing
 * the sequence number part of the last reference number. If there is no last reference number found,
 * it generates a new reference number
 */
async function generateICNRef(date: Date, bankId: string) {

  // Get the bank's code using the bankId
  const bank = await prismaClient.bank.findUnique({
    where: { id: bankId },
    select: { code: true }
  });

  if (!bank || !bank.code) {
    throw new Error("Bank not found or bank code is missing.");
  }

  // Get last reference in the references database collection
  const lastReference = await prismaClient.reference.findFirst({
    where: {
      AND: [
        {
          reference: {
            startsWith: getCurrentMonthYear(date.toDateString()), // Filtrer par mois et année
          },
        },
        {
          reference: {
            endsWith: bank.code, // Filtrer par suffixe
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc', }
  });

  let newReference: string;
  if (lastReference) {
    // Extract sequence number from last reference
    const lastSequenceNumber = parseInt(lastReference.reference.slice(4, -2)); // Exclude last 2 characters (bank code)
    newReference = `${getCurrentMonthYear(date.toDateString())}${String(lastSequenceNumber + 1).padStart(4, '0')}${bank.code}`;
  } else {
    // First reference
    newReference = `${getCurrentMonthYear(date.toDateString())}0001${bank.code}`;
  }

  return await prismaClient.reference.create({ data: { reference: newReference } });
}



async function notification(type: notificationType, transaction: any, user: any) {
  let createdBy;
  // Check the notification type
  switch (type) {
    case "publish":
      // Handle publish case Notified the user and notified all validator
      // user
      await prismaClient.notification.create({
        data: {
          email: user.email,
          message: `Your transaction ID : ${transaction.reference} has been published and is currently undergoing validation.`,
          method: NotificationMethod.EMAIL,
          subject: "New published transaction",
          template: "notification.mail.ejs",
        },
      });
      // validators
      const validadors = await getUsersWithRole();
      for (const validador of validadors) {
        await prismaClient.notification.create({
          data: {
            email: validador.email,
            message: `You have a new transaction that requires your attention for validation. Transaction ID: ${transaction.reference} Please review it at your earliest convenience.`,
            method: NotificationMethod.EMAIL,
            subject: " New Transaction Awaiting Your Validation",
            template: "notification.mail.ejs",
          },
        });
      }

      break;
    case "reject":
      // Handle reject case and notified the person who created the transactions
      createdBy = await prismaClient.user.findFirst({
        where: { id: transaction.createdBy }
      })
      if (createdBy) {
        await prismaClient.notification.create({
          data: {
            email: createdBy.email,
            message: `Your transaction ID: ${transaction.reference} has been rejected.`,
            method: NotificationMethod.EMAIL,
            subject: "Transaction Rejected",
            template: "notification.mail.ejs",
          },
        });
      }

      break;
    case "validate":
      // Handle validate case and notify the person who created the transaction and all assignators
      createdBy = await prismaClient.user.findFirst({
        where: { id: transaction.createdBy },
      });
      if (createdBy) {
        await prismaClient.notification.create({
          data: {
            email: createdBy.email,
            message: `Your transaction ID: ${transaction.reference} has been validated ,and is undergoing assignation process.`,
            method: NotificationMethod.EMAIL,
            subject: "Transaction Validated",
            template: "notification.mail.ejs",
          },
        });
      }
      // assignators
      const assignators = await getUsersWithRole('ASSIGNATOR');
      for (const assignator of assignators) {
        await prismaClient.notification.create({
          data: {
            email: assignator.email,
            message: `You have a new transaction that requires an assignation. Transaction ID: ${transaction.reference} Please review it at your earliest convenience.`,
            method: NotificationMethod.EMAIL,
            subject: " New Transaction Awaiting An Assignation",
            template: "notification.mail.ejs",
          },
        });
      }
      break;
    case "assign":
      // Handle assign case and notify the person who created the transaction
      // TODO
      // const assignCreator = await prismaClient.user.findFirst({
      //   where: { id: transaction.userId },
      // });
      // if (assignCreator) {
      //   await prismaClient.notification.create({
      //     data: {
      //       email: assignCreator.email,
      //       message: `Transaction ID: ${transaction.reference} has been assigned to you and need your commercial input.`,
      //       method: NotificationMethod.EMAIL,
      //       subject: "Transaction Assigned",
      //       template: "notification.mail.ejs",
      //     },
      //   });
      // }
      break;
    case "treat":
      // Handle treat case if needed
      break;
    default:
      console.log("Notification type", type) // TODO ajouter le cas in process (Personne a notifié ??)
    //throw new Error("Invalid notification type");
  }


}

type role = "VALIDATOR" | "ASSIGNATOR"
const getUsersWithRole = async (role: string = "VALIDATOR") => {
  const users = await prismaClient.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            name: role,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  return users;
};

