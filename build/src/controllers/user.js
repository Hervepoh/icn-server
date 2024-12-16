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
exports.removeUserRole = exports.addUserRole = exports.getUserNotification = exports.remove = exports.disactiveReactive = exports.update = exports.getById = exports.getCommercialUsers = exports.getPublic = exports.get = exports.create = void 0;
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
const unauthorized_1 = __importDefault(require("../exceptions/unauthorized"));
const internal_exception_1 = __importDefault(require("../exceptions/internal-exception"));
const key = 'users';
// Handling create user process
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate input
    users_1.signUpSchema.parse(req.body);
    const { name, email, password, unitId, roleId, ldap } = req.body;
    if (!(0, validator_1.isAnAcceptablePassword)(password)) {
        throw new bad_requests_1.default(`Invalid Password : ${validator_1.acceptablePasswordPolicy}`, http_exception_1.ErrorCode.INVALID_DATA);
    }
    const isEmailAlreadyExist = yield prismadb_1.default.user.findFirst({
        where: { email }
    });
    if (isEmailAlreadyExist)
        throw new unauthorized_1.default(`There is already a user with the email : ${email}`, http_exception_1.ErrorCode.INVALID_DATA);
    const isNameAlreadyExist = yield prismadb_1.default.user.findFirst({
        where: { name }
    });
    if (isNameAlreadyExist)
        throw new unauthorized_1.default(`There is already a user with the name : ${name}`, http_exception_1.ErrorCode.INVALID_DATA);
    let unit = null;
    if (unitId) {
        unit = yield prismadb_1.default.unit.findUnique({
            where: { id: unitId }
        });
        if (!unit)
            throw new bad_requests_1.default(`Invalid UnitId : ${unitId}`, http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Create user
    const user = yield prismadb_1.default.user.create({
        data: {
            name,
            email,
            password: yield bcrypt_1.default.hash(password, parseInt(secrets_1.SALT_ROUNDS || '10')),
            ldap,
            unitId: unit === null || unit === void 0 ? void 0 : unit.id
        }
    });
    // let role;
    // if (!roleId) {
    //     // default role
    //     role = await prismaClient.role.findFirst({
    //         where: { name: "USER" }
    //     });
    // } else {
    //     role = await prismaClient.role.findUnique({
    //         where: { id: roleId }
    //     });
    // }
    // if (!role) throw new BadRequestException(`Something went wrong`, ErrorCode.INVALID_DATA);
    // Assign default role
    // await prismaClient.userRole.create({
    //     data: {
    //         userId: user.id,
    //         roleId: role.id,
    //     }
    // });
    const assignedRoles = new Set();
    if (roleId) {
        if (typeof roleId === 'string') {
            // Si roleId est une chaîne, on l'ajoute directement
            const role = yield prismadb_1.default.role.findUnique({ where: { id: roleId } });
            if (role)
                assignedRoles.add(role.id);
        }
        else if (Array.isArray(roleId)) {
            // Si roleId est un tableau, on le traite en boucle
            for (const id of roleId) {
                const role = yield prismadb_1.default.role.findUnique({ where: { id } });
                if (role)
                    assignedRoles.add(role.id);
            }
        }
    }
    // Assignation des rôles à l'utilisateur
    for (const roleId of assignedRoles) {
        yield prismadb_1.default.userRole.create({
            data: {
                userId: user.id,
                roleId,
            }
        });
    }
    const message = ldap
        ? `**Email**: ${user.email} \n\n Please use your Outlook password to log in.`
        : `**Email**: ${user.email} \n\n  **Temporary Password**: ${password}.`;
    // User notification by mail
    yield prismadb_1.default.notification.create({
        data: {
            email: user.email,
            message: message,
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
const getPublic = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const public_key = key + '_public';
    const usersJSON = yield redis_1.redis.get(public_key);
    if (usersJSON) {
        const data = JSON.parse(usersJSON);
        res.status(200).json({
            success: true,
            data,
        });
    }
    else {
        const data = yield revalidePublicistService(public_key);
        res.status(200).json({
            success: true,
            data,
        });
    }
});
exports.getPublic = getPublic;
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
        const data = yield revalideCommercialListService(key + '_role_commercial');
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
    const queryV = `select *  from v_users_id where id='${id}'`;
    const data = yield prismadb_1.default.$queryRawUnsafe(queryV);
    // const data = await prismaClient.user.findUnique({
    //     where: { id: id },
    // });
    if (!data || data.length == 0)
        throw new not_found_1.default("User not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    // Assuming roleId is a string in your database and you want it as an array
    const userData = {
        id: data[0].id,
        name: data[0].name,
        email: data[0].email,
        ldap: Boolean(data[0].ldap),
        password: data[0].password,
        deleted: Boolean(data[0].deleted),
        roleId: data[0].roleId
            ? data[0].roleId.split(',').map(role => role.trim()) // Split(Convert comma-separated roles to an array) and trim each role
            : [], // Default to an empty array if no roles
        unitId: data[0].unitId,
    };
    res.status(200).json({
        success: true,
        data: userData
        //data: data
    });
});
exports.getById = getById;
//-----------------------------------------------------------------------------
//             UPDATE USER : put  /users/:id
//-----------------------------------------------------------------------------
// Handling  user udpdate process
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Validate ID
    if (!id) {
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    }
    if (!users_1.idSchema.parse(id)) {
        throw new bad_requests_1.default('Invalid ID format', http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Validate input
    const parsedInput = users_1.updateSchema.parse(req.body);
    // Check if user exists
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: id },
    });
    if (!user) {
        throw new bad_requests_1.default('User not found', http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Validate unit ID if provided
    let unit = null;
    if (parsedInput.unitId) {
        unit = yield prismadb_1.default.unit.findUnique({
            where: { id: parsedInput.unitId }
        });
        if (!unit)
            throw new bad_requests_1.default('Invalid Unit ID', http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Handle password update
    let newPassword = user.password; // Default to the current password
    if (parsedInput.password && parsedInput.password !== newPassword) {
        const isMatch = yield bcrypt_1.default.compare(parsedInput.password, user.password);
        if (!isMatch) {
            newPassword = yield bcrypt_1.default.hash(parsedInput.password, parseInt(secrets_1.SALT_ROUNDS || '10'));
        }
        else {
            console.warn('New password matches the old password; no update performed.');
        }
    }
    // Validate role IDs if provided
    let roleIdsToUpdate = parsedInput.roleId || []; // Use provided role IDs or default to an empty array
    let invalidRoleIds = []; // Array to collect invalid role IDs
    if (roleIdsToUpdate.length > 0) {
        const validRoles = yield prismadb_1.default.role.findMany({
            where: { id: { in: roleIdsToUpdate } },
        });
        // Identify invalid role IDs
        const validRoleIds = validRoles.map(role => role.id);
        invalidRoleIds = roleIdsToUpdate.filter(roleId => !validRoleIds.includes(roleId));
        if (invalidRoleIds.length > 0) {
            throw new internal_exception_1.default('One or more Role IDs are invalid', { invalidRoleIds }, // Include the invalid role IDs in the error response
            http_exception_1.ErrorCode.INVALID_DATA);
        }
        // Fetch existing roles for the user
        // const userRoles = await prismaClient.userRole.findMany({
        //     where: { userId: user.id },
        // });
        // const existingRoleIds = userRoles.map(role => role.roleId);
        // Determine new roles to add (not already assigned)
        const newRolesToAdd = validRoleIds; // validRoleIds.filter(roleId => !existingRoleIds.includes(roleId));
        roleIdsToUpdate = [...new Set([...newRolesToAdd])]; // Combine existing and new roles without duplicates
        yield prismadb_1.default.userRole.deleteMany({ where: { userId: user.id } });
    }
    else {
        // If no role IDs provided, delete all roles assigned to this user
        yield prismadb_1.default.userRole.deleteMany({ where: { userId: user.id } });
        roleIdsToUpdate = []; // Clear roles as all will be deleted
    }
    // Prepare data for update
    const data = {
        name: parsedInput.name || user.name,
        email: parsedInput.email || user.email,
        ldap: parsedInput.ldap !== undefined ? parsedInput.ldap : user.ldap,
        unitId: parsedInput.unitId && unit ? unit.id : user.unitId,
        password: newPassword,
    };
    // Update user in the database
    const updatedUser = yield prismadb_1.default.user.update({
        where: { id },
        data,
    });
    // Update userRoles in the database
    yield Promise.all(roleIdsToUpdate.map(roleId => prismadb_1.default.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        create: { userId: user.id, roleId },
        update: { roleId },
    })));
    // Revalidate services
    revalidateService(key);
    revalideCommercialListService(key + '_role_commercial');
    revalidePublicistService(key + '_public');
    res.status(200).json({
        success: true,
        data: { updatedUser, roles: [] }
    });
});
exports.update = update;
//-----------------------------------------------------------------------------
//             UPDATE USER : put  /users/:id/disactive-reactive
//-----------------------------------------------------------------------------
// Handling  user udpdate process
const disactiveReactive = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!id)
        throw new bad_requests_1.default('Invalid params', http_exception_1.ErrorCode.INVALID_DATA);
    if (!users_1.idSchema.parse(id))
        throw new bad_requests_1.default('Invalid ID format', http_exception_1.ErrorCode.INVALID_DATA);
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: id },
    });
    if (!user)
        throw new not_found_1.default('User not found', http_exception_1.ErrorCode.USER_NOT_FOUND);
    if (user.name == 'admin')
        throw new unauthorized_1.default('Super Admin can not be disactive', http_exception_1.ErrorCode.USER_NOT_FOUND);
    const data = yield prismadb_1.default.user.update({
        where: { id: id },
        data: { deleted: !user.deleted, deletedAt: user.deleted ? null : new Date() },
    });
    revalidateService(key);
    revalideCommercialListService(key + '_role_commercial');
    revalidePublicistService(key + '_public');
    res.status(200).json({
        success: true,
        status: data.deleted ? 'inactive' : 'active',
        data: data
    });
});
exports.disactiveReactive = disactiveReactive;
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
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: parsedData.userId },
    });
    if (!user)
        throw new not_found_1.default("User not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    const role = yield prismadb_1.default.role.findUnique({
        where: { id: parsedData.roleId },
    });
    if (!role)
        throw new not_found_1.default("Role not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    yield prismadb_1.default.userRole.create({
        data: parsedData,
    });
    res.status(200).json({
        success: true,
        message: "Role added successfully",
    });
    revalidateService(key);
    revalideCommercialListService(key + '_role_commercial');
});
exports.addUserRole = addUserRole;
const removeUserRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = users_1.userRoleSchema.parse(req.body);
    if (!parsedData)
        throw new bad_requests_1.default("Invalid data provided please ckeck the documentation", http_exception_1.ErrorCode.INVALID_DATA);
    const redis_roles = yield redis_1.redis.get('roles');
    const data = JSON.parse(redis_roles || '');
    const user = yield prismadb_1.default.user.findUnique({
        where: { id: parsedData.userId },
    });
    if (!user)
        throw new not_found_1.default("User not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    const role = yield prismadb_1.default.role.findUnique({
        where: { id: parsedData.roleId },
    });
    if (!role)
        throw new not_found_1.default("Role not found", http_exception_1.ErrorCode.RESSOURCE_NOT_FOUND);
    yield prismadb_1.default.userRole.delete({
        where: {
            userId_roleId: {
                userId: parsedData.userId,
                roleId: parsedData.roleId,
            },
        },
    });
    res.status(200).json({
        success: true,
        message: "Role removed successfully",
    });
    revalidateService(key);
    revalideCommercialListService(key + '_role_commercial');
});
exports.removeUserRole = removeUserRole;
const revalidateService = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const queryV = `select *  from v_users`;
    const data = yield prismadb_1.default.$queryRawUnsafe(queryV);
    // const data = await prismaClient.user.findMany({
    //     orderBy: {
    //         createdAt: 'desc',
    //     },
    // });
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
const revalidePublicistService = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield prismadb_1.default.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    yield redis_1.redis.set(key, JSON.stringify(data));
    return data;
});
