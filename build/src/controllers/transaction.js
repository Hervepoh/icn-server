"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkSoftRemove = exports.bulkCreate = exports.softRemove = exports.remove = exports.update = exports.getById = exports.get = exports.create = void 0;
const redis_1 = require("../libs/utils/redis");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const formatter_1 = require("../libs/utils/formatter");
const transactions_1 = require("../schema/transactions");
const unauthorized_1 = __importDefault(require("../exceptions/unauthorized"));
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const http_exception_1 = require("../exceptions/http-exception");
const app_config_1 = require("../config/app.config");
const secrets_1 = require("../secrets");
// import { bulkCreateSchema } from "../schema/transactions";
const configuration_1 = __importDefault(require("../exceptions/configuration"));
const not_found_1 = __importDefault(require("../exceptions/not-found"));
const authentificationService_1 = require("../libs/authentificationService");
const client_1 = require("@prisma/client");
const enum_1 = require("../constants/enum");
const key = 'transactions';
// Handling create process
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate input
    const parsedTransaction = transactions_1.createSchema.parse(req.body);
    const user = yield (0, authentificationService_1.getUserConnected)(req);
    const status = yield prismadb_1.default.status.findFirst({ where: { name: 'draft' } });
    const transaction = yield prismadb_1.default.transaction.create({
        data: {
            name: parsedTransaction.name,
            amount: parsedTransaction.amount,
            bankId: parsedTransaction.bank,
            statusId: status === null || status === void 0 ? void 0 : status.id,
            paymentModeId: parsedTransaction.payment_mode,
            paymentDate: (0, formatter_1.parseDMY)(parsedTransaction.payment_date),
            createdBy: user.id,
            modifiedBy: user === null || user === void 0 ? void 0 : user.id,
            userId: user === null || user === void 0 ? void 0 : user.id,
        },
    });
    revalidateService(key);
    res.status(201).json({
        success: true,
        data: transaction,
    });
    // User notification by mail
    yield prismadb_1.default.notification.create({
        data: {
            email: user.email,
            message: `A new transaction has been created with the following details :     - **Status** : Draft ,   - **Customer** : ${transaction.name} , - **Amount** : ${transaction.amount} , - **Payment Date** : ${transaction.paymentDate} . Please review the transaction at your earliest convenience.`,
            method: client_1.NotificationMethod.EMAIL,
            subject: "New transaction have been created successfully.",
            template: "notification.mail.ejs",
        },
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: enum_1.EventType.TRANSACTION,
            details: `User : ${user.email} created new Transaction : ${JSON.stringify(transaction)}`,
            endpoint: '/transactions',
            source: client_1.SourceType.USER
        },
    });
});
exports.create = create;
//-----------------------------------------------------------------------------
//             GET ALL TRANSACTIONS :  get /transactions
//-----------------------------------------------------------------------------
// Handling get process   
const get = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const soft = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role.name) !== "ADMIN" ? { deleted: false } : {};
    let query = {
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
        const validStatus = yield prismadb_1.default.status.findFirst({
            where: { name: status.toString() },
        });
        if (!validStatus)
            throw new bad_requests_1.default('Invalid status filter', http_exception_1.ErrorCode.INVALID_DATA);
        query = Object.assign({ where: { statusId: validStatus.id } }, query);
    }
    ;
    const { userId } = req.query;
    if (userId) {
        const validUserId = yield prismadb_1.default.user.findFirst({
            where: { id: userId.toString() },
        });
        if (!validUserId)
            throw new bad_requests_1.default('Invalid status filter', http_exception_1.ErrorCode.INVALID_DATA);
        query = Object.assign({ where: { userId: validUserId.id } }, query);
    }
    ;
    if (soft) {
        query = Object.assign({ where: soft }, query);
    }
    const transactions = yield prismadb_1.default.transaction.findMany(query);
    const result = transactions.map((item) => {
        var _a, _b, _c, _d, _e, _f, _g;
        return (Object.assign(Object.assign({}, item), { status: (_a = item === null || item === void 0 ? void 0 : item.status) === null || _a === void 0 ? void 0 : _a.name, bank: (_b = item === null || item === void 0 ? void 0 : item.bank) === null || _b === void 0 ? void 0 : _b.name, payment_mode: (_c = item === null || item === void 0 ? void 0 : item.paymentMode) === null || _c === void 0 ? void 0 : _c.name, payment_date: item === null || item === void 0 ? void 0 : item.paymentDate, assignTo: (_d = item === null || item === void 0 ? void 0 : item.user) === null || _d === void 0 ? void 0 : _d.name, validatedBy: (_e = item === null || item === void 0 ? void 0 : item.validator) === null || _e === void 0 ? void 0 : _e.name, modifiedBy: (_f = item === null || item === void 0 ? void 0 : item.modifier) === null || _f === void 0 ? void 0 : _f.name, createdBy: (_g = item === null || item === void 0 ? void 0 : item.creator) === null || _g === void 0 ? void 0 : _g.name, createdById: item === null || item === void 0 ? void 0 : item.createdBy }));
    });
    revalidateService(key);
    return res.status(200).json({
        success: true,
        data: result,
    });
});
exports.get = get;
//-----------------------------------------------------------------------------
//             GET TRANSACTIONS BY ID : get /transactions/:id
//-----------------------------------------------------------------------------
// Handling the process GET transaction by ID 
const getById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    let data;
    // check if the provided id is in the cache
    const isCachedExist = yield redis_1.redis.get(id);
    if (isCachedExist) {
        data = JSON.parse(isCachedExist);
    }
    else {
        data = idService(id);
    }
    return res.status(200).json({
        success: true,
        data: Object.assign(Object.assign({}, data), { amount: data.amount.toString() })
    });
});
exports.getById = getById;
//-----------------------------------------------------------------------------
//             UPDATE ROLE : put  /transactions/:id
//-----------------------------------------------------------------------------
// Handling Update transaction process
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const validatedId = transactions_1.idSchema.parse(id);
    let notificationType = "edit";
    // Check body request params for security purposes
    const forbiddenFields = [
        'createdAt', 'createdBy',
        'modifiedBy', 'deleted', 'deletedBy',
        'deletedAt'
    ];
    for (const field of forbiddenFields) {
        if (req.body[field]) {
            throw new unauthorized_1.default("Unauthorized resource", http_exception_1.ErrorCode.UNAUTHORIZE);
        }
    }
    // get the user information
    const user = yield prismadb_1.default.user.findFirst({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    let data = {};
    if (req.body.name) {
        data.name = req.body.name;
    }
    ;
    if (req.body.amount) {
        data.amount = req.body.amount;
    }
    ;
    if (req.body.bank) {
        data.bankId = req.body.bank;
    }
    ;
    if (req.body.payment_mode) {
        data.paymentModeId = req.body.payment_mode;
    }
    ;
    if (req.body.payment_date) {
        data.paymentDate = new Date(req.body.payment_date);
    }
    if (req.body.userId) {
        const userId = yield prismadb_1.default.user.findFirst({
            where: { id: req.body.userId },
        });
        if (!userId)
            throw new bad_requests_1.default("Bad request unvalidate userId", http_exception_1.ErrorCode.UNAUTHORIZE);
        data.userId = userId.id;
        notificationType = "assign";
    }
    if (req.body.status) {
        const status = yield prismadb_1.default.status.findFirst({
            where: { name: req.body.status },
        });
        if (!status)
            throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
        data.statusId = parseInt(status.id.toString());
        // For publish the request  (status === draft)
        if (req.body.status.toLocaleLowerCase() === app_config_1.appConfig.status[2].toLocaleLowerCase()) {
            const request = yield prismadb_1.default.transaction.findFirst({
                where: { id: id }
            });
            if (!(request === null || request === void 0 ? void 0 : request.reference) && (request === null || request === void 0 ? void 0 : request.paymentDate)) {
                const refId = yield genereteICNRef(request.paymentDate);
                data.reference = refId.reference;
            }
            notificationType = "publish";
        }
        // For validation
        if (req.body.status.toLocaleLowerCase() === app_config_1.appConfig.status[3].toLocaleLowerCase()) {
            data.validatorId = user.id;
            data.validatedAt = new Date();
            notificationType = "validate";
        }
        // For Reject
        if (req.body.status.toLocaleLowerCase() === app_config_1.appConfig.status[4].toLocaleLowerCase()) {
            data.validatorId = user.id;
            data.validatedAt = new Date();
            data.refusal = true;
            data.reasonForRefusal = req.body.reasonForRefusal;
            notificationType = "reject";
        }
    }
    data = Object.assign(Object.assign({}, data), { modifiedBy: user.id, updatedAt: new Date() });
    const result = yield prismadb_1.default.transaction.update({
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
    notification(notificationType, result, user);
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: enum_1.EventType.TRANSACTION,
            details: `User: ${user.email} has updated the transaction with ID: ${JSON.stringify(id)}. change value: ${JSON.stringify(data)}`,
            endpoint: '/transactions',
            source: client_1.SourceType.USER
        },
    });
});
exports.update = update;
//-----------------------------------------------------------------------------
//             DELETE TRANSACTIONS : delete  /transactions/:id
//-----------------------------------------------------------------------------
// Handling delete process
const remove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let id = req.params.id;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    id = transactions_1.idSchema.parse(id);
    yield prismadb_1.default.transaction.delete({
        where: { id: id },
    });
    yield redis_1.redis.del(id);
    revalidateService(key);
    res.status(204).send();
    const user = yield (0, authentificationService_1.getUserConnected)(req);
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: enum_1.EventType.TRANSACTION,
            details: `User : ${user.email} has deleted Transaction : ${JSON.stringify(id)}`,
            endpoint: '/transactions',
            source: client_1.SourceType.USER
        },
    });
});
exports.remove = remove;
//-----------------------------------------------------------------------------
//             SOFT-DELETE TRANSACTIONS : delete  /transactions/:id
//-----------------------------------------------------------------------------
// Handling delete process
const softRemove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const request = yield prismadb_1.default.transaction.findUnique({
        where: { id: transactions_1.idSchema.parse(id) },
    });
    if (!request)
        throw new not_found_1.default("ressource not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    // get the user information
    const user = yield prismadb_1.default.user.findFirst({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    yield prismadb_1.default.transaction.update({
        where: { id: id },
        data: {
            deleted: true,
            deletedBy: user.id,
            deletedAt: new Date(),
        },
    });
    yield redis_1.redis.del(id);
    revalidateService(key);
    res.status(204).send();
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: enum_1.EventType.TRANSACTION,
            details: `User : ${user.email} has deleted Transaction : ${JSON.stringify(id)}`,
            endpoint: '/transactions',
            source: client_1.SourceType.USER
        },
    });
});
exports.softRemove = softRemove;
// Handling create role process
const bulkCreate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validate that the request body is an array
    const requests = req.body;
    if (!Array.isArray(requests) || requests.length === 0) {
        throw new bad_requests_1.default("Request body must be a non-empty array", http_exception_1.ErrorCode.INVALID_DATA);
    }
    // const parsedData = bulkCreateSchema.parse(req.body as IBulkCreateRequest);
    // get the user information
    const user = yield prismadb_1.default.user.findFirst({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    const validRequests = [];
    // Validate each request
    for (const requestData of requests) {
        const { name, amount, bank, mode, payment_date } = requestData;
        // Validate required fields for each request
        if (!name || !amount || !bank || !payment_date) {
            throw new bad_requests_1.default("All fields (payment_date, name, amount, bank) are required for each request", http_exception_1.ErrorCode.INVALID_DATA);
        }
        const bankData = yield prismadb_1.default.bank.findFirst({
            where: { id: bank }
        });
        if (!bankData)
            throw new configuration_1.default("bankData not found, please contact adminstrator", http_exception_1.ErrorCode.BAD_CONFIGURATION);
        const payMode = yield prismadb_1.default.paymentMode.findFirst({
            where: { id: mode }
        });
        if (!payMode)
            throw new configuration_1.default("Payment mode not found, please contact adminstrator", http_exception_1.ErrorCode.BAD_CONFIGURATION);
        // Generate a unique reference if it's not provided
        // const uniqueReference = await genereteICNRef(parseDMY(payment_date));
        const data = transactions_1.transactionSchema.parse({
            // reference: uniqueReference.reference,
            name,
            amount,
            bankId: bankData.id,
            paymentDate: (0, formatter_1.parseDMY)(payment_date),
            paymentModeId: payMode.id,
            createdBy: user.id,
            modifiedBy: user.id,
            userId: user.id,
            statusId: 2
        });
        validRequests.push(data);
        // console.log("data", data)
    }
    // Insert all valid requests into the database
    const createdRequests = yield prismadb_1.default.transaction.createMany({ data: validRequests });
    res.status(201).json({
        success: true,
        //data: createdRequests,
    });
});
exports.bulkCreate = bulkCreate;
//---------------------------------------------------------
//            SOFT BULK DELETE REQUEST
//---------------------------------------------------------
// Handling soft delete process
const bulkSoftRemove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let ids = req.body.ids; // Supposons que les IDs sont passés dans le corps de la requête
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new bad_requests_1.default('Invalid params: IDs are required', http_exception_1.ErrorCode.INVALID_DATA);
    }
    ids = ids.map((id) => transactions_1.idSchema.parse(id));
    // Vérifiez si les requêtes existent
    const requests = yield prismadb_1.default.transaction.findMany({
        where: { id: { in: ids } },
    });
    if (requests.length !== ids.length) {
        throw new not_found_1.default('Invalid params: Some transactions not found', http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Supprimez les transactions en masse
    yield prismadb_1.default.transaction.deleteMany({
        where: { id: { in: ids } },
    });
    // Supprimez les entrées correspondantes du cache Redis
    yield Promise.all(ids.map((item) => redis_1.redis.del(item)));
    return res.status(200).json({
        success: true,
        message: "Transactions deleted successfully",
    });
});
exports.bulkSoftRemove = bulkSoftRemove;
const idService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.transaction.findUnique({
        where: { id: id },
        include: { bank: true, paymentMode: true }
    });
    // Put into Redis for caching futur purpose
    yield redis_1.redis.set(id, JSON.stringify(data), "EX", secrets_1.REDIS_SESSION_EXPIRE);
    return data;
});
const revalidateService = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.transaction.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });
    yield redis_1.redis.set(key, JSON.stringify(data));
    return data;
});
/**
 * The function `generateICNRef` generates a new reference based on the current date and the last
 * reference in the database collection.
 * @param {Date} date - The `genereteICNRef` function is designed to generate a new reference based on
 * the provided date. It retrieves the last reference from a database collection, extracts the sequence
 * number from it, increments the sequence number, and creates a new reference using the current month
 * and year along with the updated sequence
 * @returns The `genereteICNRef` function returns a new ICN reference number that is generated based on
 * the current date and the last reference number stored in the database. The function first retrieves
 * the last reference number from the database, then calculates a new reference number by incrementing
 * the sequence number part of the last reference number. If there is no last reference number found,
 * it generates a new reference number
 */
function genereteICNRef(date) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get last reference in the references database collection
        const lastReference = yield prismadb_1.default.reference.findFirst({
            orderBy: { createdAt: 'desc', }
        });
        let newReference;
        if (lastReference) {
            // Extraction du numéro de séquence à partir de la dernière référence
            const lastSequenceNumber = parseInt(lastReference.reference.slice(4));
            newReference = `${(0, formatter_1.getCurrentMonthYear)(date.toDateString())}${String(lastSequenceNumber + 1).padStart(6, '0')}`;
        }
        else {
            // Première référence
            newReference = `${(0, formatter_1.getCurrentMonthYear)(date.toDateString())}000001`;
        }
        return yield prismadb_1.default.reference.create({ data: { reference: newReference } });
    });
}
function notification(type, transaction, user) {
    return __awaiter(this, void 0, void 0, function* () {
        let createdBy;
        // Check the notification type
        switch (type) {
            case "publish":
                // Handle publish case Notified the user and notified all validator
                // user
                yield prismadb_1.default.notification.create({
                    data: {
                        email: user.email,
                        message: `Your transaction ID : ${transaction.reference} has been published and is currently undergoing validation.`,
                        method: client_1.NotificationMethod.EMAIL,
                        subject: "New published transaction",
                        template: "notification.mail.ejs",
                    },
                });
                // validators
                const validadors = yield getUsersWithRole();
                for (const validador of validadors) {
                    yield prismadb_1.default.notification.create({
                        data: {
                            email: validador.email,
                            message: `You have a new transaction that requires your attention for validation. Transaction ID: ${transaction.reference} Please review it at your earliest convenience.`,
                            method: client_1.NotificationMethod.EMAIL,
                            subject: " New Transaction Awaiting Your Validation",
                            template: "notification.mail.ejs",
                        },
                    });
                }
                break;
            case "reject":
                // Handle reject case and notified the person who created the transactions
                createdBy = yield prismadb_1.default.user.findFirst({
                    where: { id: transaction.createdBy }
                });
                if (createdBy) {
                    yield prismadb_1.default.notification.create({
                        data: {
                            email: createdBy.email,
                            message: `Your transaction ID: ${transaction.reference} has been rejected.`,
                            method: client_1.NotificationMethod.EMAIL,
                            subject: "Transaction Rejected",
                            template: "notification.mail.ejs",
                        },
                    });
                }
                break;
            case "validate":
                // Handle validate case and notify the person who created the transaction and all assignators
                createdBy = yield prismadb_1.default.user.findFirst({
                    where: { id: transaction.createdBy },
                });
                if (createdBy) {
                    yield prismadb_1.default.notification.create({
                        data: {
                            email: createdBy.email,
                            message: `Your transaction ID: ${transaction.reference} has been validated ,and is undergoing assignation process.`,
                            method: client_1.NotificationMethod.EMAIL,
                            subject: "Transaction Validated",
                            template: "notification.mail.ejs",
                        },
                    });
                }
                // assignators
                const assignators = yield getUsersWithRole('ASSIGNATOR');
                for (const assignator of assignators) {
                    yield prismadb_1.default.notification.create({
                        data: {
                            email: assignator.email,
                            message: `You have a new transaction that requires an assignation. Transaction ID: ${transaction.reference} Please review it at your earliest convenience.`,
                            method: client_1.NotificationMethod.EMAIL,
                            subject: " New Transaction Awaiting An Assignation",
                            template: "notification.mail.ejs",
                        },
                    });
                }
                break;
            case "assign":
                // Handle assign case and notify the person who created the transaction
                const assignCreator = yield prismadb_1.default.user.findFirst({
                    where: { id: transaction.userId },
                });
                if (assignCreator) {
                    yield prismadb_1.default.notification.create({
                        data: {
                            email: assignCreator.email,
                            message: `Transaction ID: ${transaction.reference} has been assigned to you and need your commercial input.`,
                            method: client_1.NotificationMethod.EMAIL,
                            subject: "Transaction Assigned",
                            template: "notification.mail.ejs",
                        },
                    });
                }
                break;
            case "treat":
                // Handle treat case if needed
                break;
            default:
                console.log("Notification type", type); // TODO ajouter le cas in process (Personne a notifié ??)
            //throw new Error("Invalid notification type");
        }
    });
}
const getUsersWithRole = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (role = "VALIDATOR") {
    const users = yield prismadb_1.default.user.findMany({
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
});
