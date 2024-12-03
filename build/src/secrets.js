"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIL_NO_REPLY = exports.MAIL_DOMAIN = exports.SMTP_PASSWORD = exports.SMTP_MAIL = exports.SMTP_CIPHERS = exports.SMTP_PORT = exports.SMTP_HOST = exports.SMTP_SERVICE = exports.REDIS_SESSION_EXPIRE = exports.REDIS_PASSWORD = exports.REDIS_PORT = exports.REDIS_HOSTNAME = exports.DATABASE_EXTERNAL_PASSWORD = exports.DATABASE_EXTERNAL_USERNAME = exports.DATABASE_EXTERNAL_PORT = exports.DATABASE_EXTERNAL_HOSTNAME = exports.DATABASE_EXTERNAL_SERVICE_NAME = exports.REFRESH_TOKEN_EXPIRE = exports.REFRESH_TOKEN_SECRET = exports.ACCESS_TOKEN_EXPIRE = exports.ACCESS_TOKEN_SECRET = exports.ACTIVATION_TOKEN_EXPIRE = exports.ACTIVATION_TOKEN_SECRET = exports.SALT_ROUNDS = exports.NODE_ORIGIN = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env' });
exports.PORT = process.env.NODE_PORT;
exports.NODE_ORIGIN = process.env.NODE_ORIGIN;
exports.SALT_ROUNDS = process.env.SALT_ROUNDS;
exports.ACTIVATION_TOKEN_SECRET = process.env.ACTIVATION_TOKEN_SECRET || "";
exports.ACTIVATION_TOKEN_EXPIRE = process.env.ACTIVATION_TOKEN_EXPIRE || "";
exports.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
exports.ACCESS_TOKEN_EXPIRE = process.env.ACCESS_TOKEN_EXPIRE || "";
exports.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "";
exports.REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || "";
exports.DATABASE_EXTERNAL_SERVICE_NAME = process.env.DATABASE_EXTERNAL_SERVICE_NAME || "";
exports.DATABASE_EXTERNAL_HOSTNAME = process.env.DATABASE_EXTERNAL_HOSTNAME || "";
exports.DATABASE_EXTERNAL_PORT = process.env.DATABASE_EXTERNAL_PORT || "";
exports.DATABASE_EXTERNAL_USERNAME = process.env.DATABASE_EXTERNAL_USERNAME || "";
exports.DATABASE_EXTERNAL_PASSWORD = process.env.DATABASE_EXTERNAL_PASSWORD || "";
exports.REDIS_HOSTNAME = process.env.REDIS_HOSTNAME;
exports.REDIS_PORT = process.env.REDIS_PORT;
exports.REDIS_PASSWORD = process.env.REDIS_PASSWORD;
exports.REDIS_SESSION_EXPIRE = process.env.REDIS_SESSION_EXPIRE;
exports.SMTP_SERVICE = process.env.SMTP_SERVICE;
exports.SMTP_HOST = process.env.SMTP_HOST;
exports.SMTP_PORT = process.env.SMTP_PORT;
exports.SMTP_CIPHERS = process.env.SMTP_CIPHERS;
exports.SMTP_MAIL = process.env.SMTP_MAIL;
exports.SMTP_PASSWORD = process.env.SMTP_PASSWORD;
exports.MAIL_DOMAIN = process.env.MAIL_DOMAIN;
exports.MAIL_NO_REPLY = process.env.MAIL_NO_REPLY;
