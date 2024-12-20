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
exports.bulkSolftDelete = exports.softDelete = exports.update = exports.create = exports.remove = exports.bulkUpdate = exports.bulkCreate = exports.get = void 0;
const redis_1 = require("../libs/utils/redis");
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const http_exception_1 = require("../exceptions/http-exception");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const not_found_1 = __importDefault(require("../exceptions/not-found"));
const unauthorized_1 = __importDefault(require("../exceptions/unauthorized"));
const client_1 = require("@prisma/client");
const get = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource due", http_exception_1.ErrorCode.UNAUTHORIZE);
    const datas = yield prismadb_1.default.transactionDetail.findMany({
        where: {
            transactionId: id
        },
        orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({
        success: true,
        data: datas,
    });
});
exports.get = get;
const bulkCreate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    // check if the transaction id is valid
    const transaction = yield prismadb_1.default.transaction.findUnique({
        where: { id: id }
    });
    if (!transaction)
        throw new bad_requests_1.default("Bad request params", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    // checkif the transaction is in the status pending_commercial_input 
    if (transaction.statusId !== 6)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    //TODO: check if the user is the assignee of the record
    // const isAssignTo = await prismaClient.transaction.findFirst({
    //   where: {
    //     id: id,
    //     userId: req.user?.id,
    //   }
    // });
    // if (!isAssignTo) throw new UnauthorizedException("Unauthorize ressource : please contact assignator", ErrorCode.UNAUTHORIZE);
    let data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
        throw new bad_requests_1.default('Invalid params format', http_exception_1.ErrorCode.INVALID_DATA);
    }
    data = data.map((item) => {
        var _a;
        return (Object.assign(Object.assign({}, item), { amountUnpaid: parseInt(item.amountUnpaid), amountTopaid: (_a = parseInt(item.amountUnpaid)) !== null && _a !== void 0 ? _a : 0, transactionId: transaction.id, userId: user.id }));
    });
    yield prismadb_1.default.transactionDetail.createMany({ data: data });
    res.status(201).json({
        success: true,
        message: "Bulk request details created successfully",
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: client_1.EventType.TRANSACTION,
            details: `User : ${user.email} added in transaction ID: ${id} new invoices : }`, // ${JSON.stringify(data)
            endpoint: 'transactions-details',
            source: client_1.SourceType.USER
        },
    });
});
exports.bulkCreate = bulkCreate;
const bulkUpdate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    // check if the user id is valid
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    let data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
        throw new bad_requests_1.default('Invalid params format', http_exception_1.ErrorCode.INVALID_DATA);
    }
    // // Vérifier le format des mises à jour
    // for (const row of data) {
    //   if (!row.hasOwnProperty('id') || typeof row.id !== 'string'
    //     || !row.hasOwnProperty('selected') || typeof row.selected !== 'boolean'
    //     || !row.hasOwnProperty('amountTopaid') || typeof row.amountTopaid !== 'number') {
    //     return res.status(400).json({ error: 'Invalid update format' });
    //   }
    // }
    // Data needed to be an array of objects
    // updateOne: {
    //   filter: { id: row.id },
    //   update: {
    //     selected: row.selected,
    //     amountTopaid: row.amountTopaid,
    //   },
    // },
    // await prismaClient.transactionDetail.updateMany({
    //   data: data,
    // });
    yield Promise.all(data.map((item) => __awaiter(void 0, void 0, void 0, function* () {
        yield prismadb_1.default.transactionDetail.updateMany({
            where: {
                id: item.id, // or any other unique identifier
            },
            data: Object.assign({}, item),
        });
    })));
    res.status(200).json({
        success: true,
        message: "successfully Bulk updated request details",
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: client_1.EventType.TRANSACTION,
            details: `User : ${user.email} updated in transaction ID: ${id} the invoices: ${JSON.stringify(data)}`,
            endpoint: '/transactions-details',
            source: client_1.SourceType.USER
        },
    });
});
exports.bulkUpdate = bulkUpdate;
const remove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    // check if the user id is valid
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource due", http_exception_1.ErrorCode.UNAUTHORIZE);
    const requestDetail = yield prismadb_1.default.transactionDetail.findUnique({
        where: { id: id },
    });
    if (!requestDetail) {
        throw new not_found_1.default("Request not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    }
    yield prismadb_1.default.transactionDetail.delete({
        where: { id: id }
    });
    res.status(200).json({
        success: true,
        message: "RequestDetail deleted successfully",
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: client_1.EventType.TRANSACTION,
            details: `User : ${user.email} delete in transaction ID: ${id} the invoice: ${JSON.stringify(requestDetail)}`,
            endpoint: '/transactions-details',
            source: client_1.SourceType.USER
        },
    });
});
exports.remove = remove;
/*
 * create is an asynchronous function that creates a record in the database.
 * It first retrieves the user information from the database, and then creates records with the provided data,
 * including the payment date, the name of the user who created the record, and the user's ID.
 * If the user is not found, it returns an error with a 401 (Unauthorized) status code.
 */
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const requestId = req.params.id;
    if (!requestId)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    // check if the user id is valid
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    //TODO: check if the user is the assignee of the record
    const data = Object.assign(Object.assign({}, req.body), { userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id });
    const request = yield prismadb_1.default.transactionDetail.create({ data: data });
    res.status(201).json({
        success: true,
        data: request,
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: client_1.EventType.TRANSACTION,
            details: `User : ${user.email} create in transaction ID: ${requestId} new invoice: ${JSON.stringify(data)}`,
            endpoint: '/transactions-details',
            source: client_1.SourceType.USER
        },
    });
});
exports.create = create;
/*
 * update, is an asynchronous function
 * that update a speficic record with the provided information
 */
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const requestId = req.params.id;
    // check if the provided ressource id is valid
    if (!requestId)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    // get the user information
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    // let data = {
    //   ...req.body,
    //   modifiedBy: user.id,
    // };
    // if (req.body.payment_date) {
    //   //TODO
    //   console.log("TODO fix issue in edit request feature")
    //   data = {
    //     ...data,
    //     payment_date: parseDMY(req.body.payment_date),
    //   };
    // }
    // // For validation
    // if (req.body.status === appConfig.status[3]) {
    //   data = {
    //     ...data,
    //     validator: user.id,
    //     validetedAt: new Date()
    //   };
    // }
    // // For Reject
    // if (req.body.status === appConfig.status[4]) {
    //   data = {
    //     ...data,
    //     validator: user.id,
    //     validetedAt: new Date(),
    //     refusal: true,
    //   };
    // }
    // const result = await requestModel.findByIdAndUpdate(
    //   requestId,
    //   { $set: data },
    //   { new: true }
    // );
    // // // Put into Redis for caching futur purpose
    // // await redis.set(
    // //   requestId,
    // //   JSON.stringify(result),
    // //   "EX",
    // //   appConfig.redis_session_expire
    // // );
    // return res.status(200).json({
    //   success: true,
    //   message: "Resource updated successfully",
    //   data: result,
    // });
});
exports.update = update;
/*
 * softDelete, is an asynchronous function
 * that update a specicif record to a deleted status
 * so simple user can not see them again
 */
const softDelete = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const data = yield prismadb_1.default.transactionDetail.findUnique({
        where: { id: id }
    });
    if (!data)
        throw new not_found_1.default('Ressource not found', http_exception_1.ErrorCode.INVALID_DATA);
    // get the user information
    const user = yield prismadb_1.default.user.findFirst({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    yield prismadb_1.default.transactionDetail.update({
        where: { id: id },
        data: {
            deleted: true,
            deletedAt: new Date(),
        }
    });
    yield redis_1.redis.del(id);
    res.status(200).json({
        success: true,
        message: "Request soft deleted successfully",
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: client_1.EventType.TRANSACTION,
            details: `User : ${user.email} remove the invoice: ${id}`,
            endpoint: '/transactions-details',
            source: client_1.SourceType.USER
        },
    });
});
exports.softDelete = softDelete;
//---------------------------------------------------------
//            SOFT BULK DELETE REQUEST
//---------------------------------------------------------
const bulkSolftDelete = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    // get the user information
    const user = yield prismadb_1.default.user.findFirst({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    const request = yield prismadb_1.default.transactionDetail.findUnique({
        where: { id: id },
    });
    if (!request)
        throw new not_found_1.default("Request not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    yield prismadb_1.default.transactionDetail.delete({
        where: { id: id }
    });
    yield redis_1.redis.del(id);
    res.status(200).json({
        success: true,
        message: "Request deleted successfully",
    });
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: client_1.EventType.TRANSACTION,
            details: `User : ${user.email} remove in transaction ID: ${request.transactionId} the invoice: ${JSON.stringify(request)}`,
            endpoint: '/transactions-details',
            source: client_1.SourceType.USER
        },
    });
});
exports.bulkSolftDelete = bulkSolftDelete;
