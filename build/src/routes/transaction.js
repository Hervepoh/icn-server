"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enum_1 = require("../constants/enum");
const error_handler_1 = require("../error-handler");
const auth_1 = __importStar(require("../middlewares/auth"));
const transaction_1 = require("../controllers/transaction");
const transactions_lock_1 = require("../controllers/transactions-lock");
const transaction_export_1 = require("../controllers/transaction-export");
const serviceName = enum_1.serviceType.TRANSACTION;
const transactionRoutes = (0, express_1.Router)();
transactionRoutes.post('/', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-CREATE`, `${serviceName}-WRITE`)], (0, error_handler_1.errorHandler)(transaction_1.create));
transactionRoutes.get('/', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-READ`)], (0, error_handler_1.errorHandler)(transaction_1.get));
transactionRoutes.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-READ`)], (0, error_handler_1.errorHandler)(transaction_1.getById));
transactionRoutes.put('/:id', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-UPDATE`, `${serviceName}-VALIDATE`, `${serviceName}-ASSIGN`, `${serviceName}-WRITE`, `${serviceName}-COMMERCIAL`)], (0, error_handler_1.errorHandler)(transaction_1.update));
transactionRoutes.delete('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-DELETE`, `${serviceName}-WRITE`)], (0, error_handler_1.errorHandler)(transaction_1.softRemove));
transactionRoutes.delete('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-FULLDELETE`)], (0, error_handler_1.errorHandler)(transaction_1.remove));
transactionRoutes.post('/bulk', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-BULKCREATE`)], (0, error_handler_1.errorHandler)(transaction_1.bulkCreate));
transactionRoutes.delete('/bulk', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-BULKDELETE`)], (0, error_handler_1.errorHandler)(transaction_1.bulkSoftRemove));
transactionRoutes.get('/export/:id', [auth_1.default], (0, error_handler_1.errorHandler)(transaction_export_1.exportData));
transactionRoutes.post('/quality-assurance/:id', [auth_1.default], (0, error_handler_1.errorHandler)(transaction_1.qualityAssurance));
transactionRoutes.get('/lock', (0, error_handler_1.errorHandler)(transactions_lock_1.getLock));
transactionRoutes.post('/lock', [auth_1.default], (0, error_handler_1.errorHandler)(transactions_lock_1.addLock));
transactionRoutes.delete('/lock', [auth_1.default], (0, error_handler_1.errorHandler)(transactions_lock_1.removeLock));
exports.default = transactionRoutes;
