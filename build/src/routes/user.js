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
const error_handler_1 = require("../error-handler");
const auth_1 = __importStar(require("../middlewares/auth"));
const user_1 = require("../controllers/user");
const enum_1 = require("../constants/enum");
const serviceName = enum_1.serviceType.USER;
const userRoutes = (0, express_1.Router)();
userRoutes.post('/', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-CREATE`)], (0, error_handler_1.errorHandler)(user_1.create));
userRoutes.get('/commercial', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-SEARCH`)], (0, error_handler_1.errorHandler)(user_1.getCommercialUsers));
userRoutes.get('/public', [auth_1.default], (0, error_handler_1.errorHandler)(user_1.getPublic));
userRoutes.get('/', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-READ`)], (0, error_handler_1.errorHandler)(user_1.get));
userRoutes.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-READ`)], (0, error_handler_1.errorHandler)(user_1.getById));
userRoutes.put('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-UPDATE`)], (0, error_handler_1.errorHandler)(user_1.update));
userRoutes.put('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/disactive-reactive', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-UPDATE`)], (0, error_handler_1.errorHandler)(user_1.disactiveReactive));
userRoutes.delete('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-DELETE`)], (0, error_handler_1.errorHandler)(user_1.remove));
userRoutes.get('/notifications', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-READNOTIFICATION`, `${serviceName}-NOTIFICATION`)], (0, error_handler_1.errorHandler)(user_1.getUserNotification));
userRoutes.post('/role', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-ADDROLE`, `${serviceName}-ROLE`)], (0, error_handler_1.errorHandler)(user_1.addUserRole));
userRoutes.delete('/role', [auth_1.default, (0, auth_1.authorizeMiddleware)(`${serviceName}-REMOVEROLE`, `${serviceName}-ROLE`)], (0, error_handler_1.errorHandler)(user_1.removeUserRole));
exports.default = userRoutes;
