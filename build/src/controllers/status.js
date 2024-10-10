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
exports.update = exports.getByName = exports.getById = exports.get = void 0;
const redis_1 = require("../libs/utils/redis");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const not_found_1 = __importDefault(require("../exceptions/not-found"));
const http_exception_1 = require("../exceptions/http-exception");
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const key = 'status';
//-----------------------------------------------------------------------------
//             GET ALL STATUS :  get /status
//-----------------------------------------------------------------------------
// Handling the process GET banks 
const get = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, id } = req.query;
    let data;
    if (id) {
        data = yield getByIdService(parseInt(id.toString()));
        return res.status(200).json({
            success: true,
            data
        });
    }
    if (name) {
        data = yield getByNameService(name.toString());
        return res.status(200).json({
            success: true,
            data
        });
    }
    const redis_data = yield redis_1.redis.get(key);
    if (redis_data) {
        data = JSON.parse(redis_data);
    }
    else {
        data = yield revalidateService(key);
    }
    res.status(200).json({
        success: true,
        data
    });
});
exports.get = get;
//-----------------------------------------------------------------------------
//             GET status BY ID : get /bank/:id
//-----------------------------------------------------------------------------
// Handling the process GET status by ID 
const getById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const data = getByIdService(parseInt(id));
    res.status(200).json({
        success: true,
        data
    });
});
exports.getById = getById;
//-----------------------------------------------------------------------------
//             GET status BY name : get /bank
//-----------------------------------------------------------------------------
// Handling the process GET status by ID 
const getByName = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.body;
    if (!name)
        throw new bad_requests_1.default('Invalid params ', http_exception_1.ErrorCode.INVALID_DATA);
    const data = getByNameService(name);
    res.status(200).json({
        success: true,
        data
    });
});
exports.getByName = getByName;
//-----------------------------------------------------------------------------
//             UPDATE status : put  /banks/:id
//-----------------------------------------------------------------------------
// Handling Update status process
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const { name } = req.body;
    const data = yield prismadb_1.default.status.update({
        where: { id: parseInt(id) },
        data: { name },
    });
    revalidateService(key);
    res.status(200).json({
        success: true,
        data
    });
});
exports.update = update;
const revalidateService = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.status.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });
    yield redis_1.redis.set(key, JSON.stringify(data));
    return data;
});
const getByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.status.findUnique({
        where: { id: id },
    });
    if (!data)
        throw new not_found_1.default("status not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    return data;
});
const getByNameService = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.status.findFirst({
        where: { name: name },
    });
    if (!data)
        throw new not_found_1.default("status not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    return data;
});
