"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_handler_1 = require("../error-handler");
const auth_1 = __importDefault(require("../middlewares/auth"));
const status_1 = require("../controllers/status");
const statusRoutes = (0, express_1.Router)();
statusRoutes.get('/', [auth_1.default], (0, error_handler_1.errorHandler)(status_1.get));
exports.default = statusRoutes;
