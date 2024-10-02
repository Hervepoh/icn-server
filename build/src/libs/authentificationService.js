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
exports.getUserConnected = void 0;
const prismadb_1 = __importDefault(require("./prismadb"));
const unauthorized_1 = __importDefault(require("../exceptions/unauthorized"));
const http_exception_1 = require("../exceptions/http-exception");
const getUserConnected = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield prismadb_1.default.user.findFirst({
        where: { id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
    });
    if (!user)
        throw new unauthorized_1.default("Unauthorize ressource", http_exception_1.ErrorCode.UNAUTHORIZE);
    return user;
});
exports.getUserConnected = getUserConnected;
