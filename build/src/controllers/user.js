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
exports.removeUserRole = exports.addUserRole = exports.getUserNotification = exports.remove = exports.update = exports.getById = exports.getCommercialUsers = exports.get = exports.create = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const redis_1 = require("../libs/utils/redis");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const http_exception_1 = require("../exceptions/http-exception");
const validator_1 = require("../libs/utils/validator");
const secrets_1 = require("../secrets");
const users_1 = require("../schema/users");
const client_1 = require("@prisma/client");
const not_found_1 = __importDefault(require("../exceptions/not-found"));
const key = 'users';
// Handling create user process
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate input
    users_1.signUpSchema.parse(req.body);
    const { name, email, password, roleId } = req.body;
    if (!(0, validator_1.isAnAcceptablePassword)(password)) {
        throw new bad_requests_1.default(`Invalid Password : ${validator_1.acceptablePasswordPolicy}`, http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Create user
    const user = yield prismadb_1.default.user.create({
        data: {
            name,
            email,
            password: yield bcrypt_1.default.hash(password, parseInt(secrets_1.SALT_ROUNDS || '10')),
        }
    });
    let role;
    if (!roleId) {
        // default role
        role = yield prismadb_1.default.role.findFirst({
            where: { name: "USER" }
        });
    }
    else {
        role = yield prismadb_1.default.role.findUnique({
            where: { id: roleId }
        });
    }
    if (!role)
        throw new bad_requests_1.default(`Something went wrong`, http_exception_1.ErrorCode.INVALID_DATA);
    // Assign default role
    yield prismadb_1.default.userRole.create({
        data: {
            userId: user.id,
            roleId: role.id,
        }
    });
    // User notification by mail
    yield prismadb_1.default.notification.create({
        data: {
            email: user.email,
            message: `**Email** : ${user.email} " <br/> **Temporary Password**: ${password}`,
            method: client_1.NotificationMethod.EMAIL,
            subject: "Your account has been created successfully.",
            template: "new.mail.ejs",
        },
    });
    revalidateService(key);
    revalideCommercialListService(key);
    res.status(201).json({
        success: true,
        data: user
    });
});
exports.create = create;
//-----------------------------------------------
//       Get All Users : get users
//-----------------------------------------------
// Handling the process GET users information 
const get = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const usersJSON = yield redis_1.redis.get(key);
    if (usersJSON) {
        const data = JSON.parse(usersJSON);
        res.status(200).json({
            success: true,
            data,
        });
    }
    else {
        const data = yield revalidateService(key);
        res.status(200).json({
            success: true,
            data,
        });
    }
});
exports.get = get;
//-----------------------------------------------
//       Get All Users : get users
//-----------------------------------------------
// Handling the process GET users information 
const getCommercialUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const usersJSON = yield redis_1.redis.get(key + '_role_commercial');
    if (usersJSON) {
        const data = JSON.parse(usersJSON);
        res.status(200).json({
            success: true,
            data,
        });
    }
    else {
        const data = yield revalideCommercialListService(key);
        res.status(200).json({
            success: true,
            data,
        });
    }
});
exports.getCommercialUsers = getCommercialUsers;
//-----------------------------------------------------------------------------
//             GET USER BY ID : get /users/:id
//-----------------------------------------------------------------------------
// Handling the process GET user by ID 
const getById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    const data = yield prismadb_1.default.user.findUnique({
        where: { id: id },
    });
    if (!data)
        throw new not_found_1.default("User not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    res.status(200).json({
        success: true,
        data: data
    });
});
exports.getById = getById;
//-----------------------------------------------------------------------------
//             UPDATE USER : put  /users/:id
//-----------------------------------------------------------------------------
// Handling  user udpdate process
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    if (!users_1.idSchema.parse(id))
        throw new bad_requests_1.default('Invalid ID format', http_exception_1.ErrorCode.INVALID_DATA);
    const parsedInput = users_1.updateSchema.parse(req.body); // Validate input
    const data = yield prismadb_1.default.user.update({
        where: { id: id },
        data: parsedInput,
    });
    revalidateService(key);
    revalideCommercialListService(key);
    res.status(200).json({
        success: true,
        data: data
    });
});
exports.update = update;
//-----------------------------------------------------------------------------
//             DELETE USER : delete  /users/:id
//-----------------------------------------------------------------------------
// Handling delete user process
const remove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    if (!users_1.idSchema.parse(id))
        throw new bad_requests_1.default('Invalid ID format', http_exception_1.ErrorCode.INVALID_DATA);
    yield prismadb_1.default.userRole.deleteMany({
        where: { userId: id }
    });
    yield prismadb_1.default.user.delete({
        where: { id: id }
    });
    revalidateService(key);
    revalideCommercialListService(key);
    res.status(204).send(); // No content
});
exports.remove = remove;
//-----------------------------------------------
//              get user notifications
//-----------------------------------------------
const getUserNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("user", req.user);
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new bad_requests_1.default('Please first login if you want to achieve this action', http_exception_1.ErrorCode.INVALID_DATA);
    }
    const notifications = yield prismadb_1.default.notification
        .findMany({
        where: {
            userId: req.user.id, // Récupérer les notifications pour l'utilisateur spécifique
            NOT: {
                userId: null, // Exclure les notifications où userId est null
            },
        },
    });
    res.status(200).json({
        success: true,
        notifications,
    });
});
exports.getUserNotification = getUserNotification;
const addUserRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = users_1.userRoleSchema.parse(req.body);
    if (!parsedData)
        throw new bad_requests_1.default("Invalid data provided please ckeck the documentation", http_exception_1.ErrorCode.INVALID_DATA);
    const redis_roles = yield redis_1.redis.get('roles');
    const data = JSON.parse(redis_roles || '');
    // const validRoles: string[] = ["admin", "teacher", ;
    // if (!validRoles.includes(role)) {
    //   return next(new ErrorHandler("Invalid 'role'", 400));
    // }
    // const user = await userModel.findById(userId);
    // if (!user) {
    //   return next(new ErrorHandler("User not found", 404));
    // }
    // updateUserRoleService(res, userId, role);
    revalidateService(key);
    revalideCommercialListService(key);
});
exports.addUserRole = addUserRole;
const removeUserRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, roleId } = req.body;
    if (!userId || !roleId)
        throw new bad_requests_1.default("Invalid data provided please ckeck the documentation", http_exception_1.ErrorCode.INVALID_DATA);
    const redis_roles = yield redis_1.redis.get('roles');
    const data = JSON.parse(redis_roles || '');
    // const validRoles: string[] = ["admin", "teacher", ;
    // if (!validRoles.includes(role)) {
    //   return next(new ErrorHandler("Invalid 'role'", 400));
    // }
    // const user = await userModel.findById(userId);
    // if (!user) {
    //   return next(new ErrorHandler("User not found", 404));
    // }
    // updateUserRoleService(res, userId, role);
    revalidateService(key);
    revalideCommercialListService(key);
});
exports.removeUserRole = removeUserRole;
const revalidateService = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.user.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });
    yield redis_1.redis.set(key, JSON.stringify(data));
    return data;
});
const revalideCommercialListService = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.user.findMany({
        where: {
            roles: {
                some: {
                    role: {
                        name: 'COMMERCIAL',
                    },
                },
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    yield redis_1.redis.set(key + '_role_commercial', JSON.stringify(data));
    return data;
});
