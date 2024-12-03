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
exports.me = exports.updateAccessToken = exports.signout = exports.signin = exports.activate = exports.createActivationToken = exports.signup = void 0;
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const redis_1 = require("../libs/utils/redis");
const sendMail_1 = __importDefault(require("../libs/utils/sendMail"));
const validator_1 = require("../libs/utils/validator");
const jwt_1 = require("../libs/utils/jwt");
const http_exception_1 = __importStar(require("../exceptions/http-exception"));
const configuration_1 = __importDefault(require("../exceptions/configuration"));
const unauthorized_1 = __importDefault(require("../exceptions/unauthorized"));
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const not_found_1 = __importDefault(require("../exceptions/not-found"));
const secrets_1 = require("../secrets");
const enum_1 = require("../constants/enum");
const user_1 = require("../entities/user");
const users_1 = require("../schema/users");
const client_1 = require("@prisma/client");
const authentificationService_1 = require("../libs/authentificationService");
// Handling the user registration(signup) process.
const signup = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate input
    users_1.signUpSchema.parse(req.body);
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        throw new bad_requests_1.default("Please enter your name, email and password", http_exception_1.ErrorCode.UNFULLFIELD_REQUIRED_FIELD);
    }
    if (!(0, validator_1.isValidPassword)(password)) {
        throw new bad_requests_1.default(`Invalid Password : ${validator_1.passwordPolicy}`, http_exception_1.ErrorCode.INVALID_DATA);
    }
    // check if the email already exists in the database
    const isEmailExist = yield prismadb_1.default.user.findFirst({ where: { email: email } });
    if (isEmailExist) {
        throw new bad_requests_1.default("Email already exist", http_exception_1.ErrorCode.RESSOURCE_ALREADY_EXISTS);
    }
    const user = {
        name,
        email,
        password,
    };
    const activationToken = (0, exports.createActivationToken)(user);
    // activationCode
    const activationCode = activationToken.activationCode;
    // TTL of the activation token
    const activationCodeExpire = Math.floor(parseInt(secrets_1.ACTIVATION_TOKEN_EXPIRE) / 60);
    const data = {
        user: { name: user.name },
        activationCode,
        activationCodeExpire,
        supportmail: secrets_1.MAIL_NO_REPLY
    };
    const html = yield ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/activation.mail.ejs"), data);
    try {
        yield (0, sendMail_1.default)({
            email: user.email,
            subject: "Activation of your account",
            template: "activation.mail.ejs",
            data,
        });
        res.status(201).json({
            success: true,
            message: `Please check your email : ${user.email} to activate your account`,
            activationToken: activationToken.token,
        });
    }
    catch (error) {
        throw new http_exception_1.default(error.message, 500, http_exception_1.ErrorCode.INTERNAL_EXCEPTION, null);
    }
});
exports.signup = signup;
/**
 * Generates an activation token containing a random activation code for a user.
 * @param {any} user - The `user` parameter in the `createActivationToken` function is an object that
 * represents the user for whom the activation token is being created. It likely contains information
 * about the user, such as their username, email, and other relevant details.
 * @returns returns an object with two properties: `token` and `activationCode`.
 */
const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jsonwebtoken_1.default.sign({ user, activationCode }, secrets_1.ACTIVATION_TOKEN_SECRET, { expiresIn: (0, jwt_1.expiredFormat)(secrets_1.ACTIVATION_TOKEN_EXPIRE) });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
const activate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { activation_token, activation_code } = req.body;
    if (activation_token === undefined || activation_code === undefined) {
        throw new bad_requests_1.default("Invalid request, please provide activation_code and activation_token", http_exception_1.ErrorCode.INVALID_DATA);
    }
    const newUser = jsonwebtoken_1.default.verify(activation_token, secrets_1.ACTIVATION_TOKEN_SECRET);
    if (newUser.activationCode !== activation_code) {
        throw new bad_requests_1.default("Invalid activation code", http_exception_1.ErrorCode.INVALID_DATA);
    }
    const { name, email, password } = newUser.user;
    const existUser = yield prismadb_1.default.user.findFirst({
        where: { email }
    });
    if (existUser)
        throw new not_found_1.default("Email already exist", http_exception_1.ErrorCode.RESSOURCE_ALREADY_EXISTS);
    const userEntity = new user_1.UserEntity({ name, email, password });
    const isPasswordMatched = yield userEntity.comparePassword(password);
    const user = yield prismadb_1.default.user.create({
        data: {
            name,
            email,
            password: yield bcrypt_1.default.hash(password, parseInt(secrets_1.SALT_ROUNDS || '10')),
        }
    });
    // Étape 2: Associer le rôle à l'utilisateur
    const roleName = 'USER';
    const role = yield prismadb_1.default.role.findUnique({
        where: { name: roleName },
    });
    if (role) {
        yield prismadb_1.default.userRole.create({
            data: {
                userId: user.id,
                roleId: role.id,
            },
        });
        console.log(`Assigned role '${roleName}' to user '${user.name}'.`);
    }
    else {
        console.error(`Role '${roleName}' not found.`);
    }
    res.status(201).json({
        success: true,
        message: `Your account is activate`,
    });
});
exports.activate = activate;
// Handling the user login(signin) process
const signin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, roleId } = req.body;
    // Validation of user inputs
    if (!email || !password) {
        throw new bad_requests_1.default("Please enter both Email and Password", http_exception_1.ErrorCode.UNFULLFIELD_REQUIRED_FIELD);
    }
    // Check if user exists in the database
    const user = yield prismadb_1.default.user.findFirst({
        where: { email: email },
        include: { roles: true }, // Include roles relation
    });
    if (!user) {
        throw new not_found_1.default("Invalid Email or Password", http_exception_1.ErrorCode.INVALID_DATA);
    }
    if (user.roles.length === 0) {
        return next(new configuration_1.default("User has no roles assigned", http_exception_1.ErrorCode.BAD_CONFIGURATION));
    }
    let roleIdToConnect;
    // If user has multiple roles, check if a role is specifie
    if (user.roles.length > 1) {
        if (!roleId)
            throw new bad_requests_1.default("Please specify a role to sign in", http_exception_1.ErrorCode.INVALID_DATA);
        // Check if the specified role exists in the user's roles
        const roleExists = user.roles.some(userRole => userRole.roleId === roleId);
        if (!roleExists) {
            return next(new bad_requests_1.default("Invalid role specified", http_exception_1.ErrorCode.BAD_CONFIGURATION));
        }
        roleIdToConnect = roleId;
    }
    else {
        roleIdToConnect = user.roles[0].roleId;
    }
    const role = yield prismadb_1.default.role.findUnique({
        where: { id: roleIdToConnect },
        select: {
            id: true,
            name: true,
            RolePermission: {
                select: {
                    permission: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });
    const userEntity = new user_1.UserEntity(Object.assign(Object.assign({}, user), { role }));
    // Extract userId from email
    const userId = email.split('@')[0]; // Get the part before '@'
    // LDAP authentication
    if (user.ldap) {
        const isLdapAuthentificated = yield (0, authentificationService_1.ldapLogin)(userId, password);
        if (!isLdapAuthentificated) {
            return next(new bad_requests_1.default("Invalid Email or Password", http_exception_1.ErrorCode.INVALID_DATA));
        }
    }
    else {
        const isPasswordMatched = yield userEntity.comparePassword(password);
        if (!isPasswordMatched) {
            return next(new bad_requests_1.default("Invalid Email or Password", http_exception_1.ErrorCode.INVALID_DATA));
        }
    }
    // When every thing is ok send Token to user
    const accessToken = userEntity.signAccessToken();
    const refreshToken = userEntity.signRefreshToken();
    //Upload session to redis
    const session = Object.assign(Object.assign({}, user), { role, ipAddress: req.ip, accessToken, refreshToken });
    redis_1.redis.set(accessToken, JSON.stringify(session), "EX", secrets_1.ACCESS_TOKEN_EXPIRE);
    redis_1.redis.set(refreshToken, JSON.stringify(Object.assign({}, session)), "EX", secrets_1.REFRESH_TOKEN_EXPIRE);
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            action: enum_1.EventType.LOGIN,
            details: `User : ${user.email} has logged in`,
            endpoint: '/login',
            source: client_1.SourceType.USER
        },
    });
    res.status(200).json({
        success: true,
        // message: 'User successfully logged in',
        //user: userEntity.cleanUser(),
        accessToken,
        refreshToken
    });
});
exports.signin = signin;
//-----------------------------------------------
//               Logout User /logout
//-----------------------------------------------
const signout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.accessToken))
        throw new http_exception_1.default('Something went wrong', 500, http_exception_1.ErrorCode.INTERNAL_EXCEPTION, ['accessToken unavalaible']);
    // Delete in redis the user access token to logout the user
    redis_1.redis.del((_b = req.user) === null || _b === void 0 ? void 0 : _b.accessToken);
    // Audit entry for tracking purpose
    yield prismadb_1.default.audit.create({
        data: {
            userId: req.user.id,
            ipAddress: req.ip,
            action: enum_1.EventType.LOGIN,
            details: `User : ${req.user.email} has logged out`,
            endpoint: '/logout',
            source: client_1.SourceType.USER
        },
    });
    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
});
exports.signout = signout;
//-----------------------------------------------
//              Update User Access Token /user/refresh
//-----------------------------------------------
const updateAccessToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // const refresh_token = req.cookies.refresh_token as string;
    const refresh_token = req.headers.authorization;
    if (!refresh_token)
        return next(new unauthorized_1.default("Could not refresh token , please provide an authorization token.", http_exception_1.ErrorCode.UNAUTHORIZE));
    const decoded = jsonwebtoken_1.default.verify(refresh_token, secrets_1.REFRESH_TOKEN_SECRET);
    if (!decoded)
        return next(new unauthorized_1.default("Unauthorized: Access token is not valid, please login to access this resource", http_exception_1.ErrorCode.UNAUTHORIZE));
    const session = yield redis_1.redis.get(refresh_token);
    if (!session) {
        throw new unauthorized_1.default("Could not refresh token , please login for access this ressource.", http_exception_1.ErrorCode.UNAUTHORIZE);
    }
    const userSession = JSON.parse(session);
    const accessToken = jsonwebtoken_1.default.sign({ id: userSession.id }, secrets_1.ACCESS_TOKEN_SECRET, { expiresIn: (0, jwt_1.expiredFormat)(secrets_1.ACCESS_TOKEN_EXPIRE) });
    const refreshToken = jsonwebtoken_1.default.sign({ id: userSession.id }, secrets_1.REFRESH_TOKEN_SECRET, { expiresIn: (0, jwt_1.expiredFormat)(secrets_1.REFRESH_TOKEN_EXPIRE) });
    // // Add User in the request to user it in any request
    req.user = Object.assign({}, userSession);
    // res.cookie("access_token", accessToken, accessTokenOptions);
    // res.cookie("refresh_token", refreshToken, refreshTokenOptions);
    // //Update redis session
    const newSession = Object.assign(Object.assign({}, userSession), { ipAddress: req.ip, accessToken, refreshToken });
    redis_1.redis.set(accessToken, JSON.stringify(newSession), "EX", secrets_1.ACCESS_TOKEN_EXPIRE);
    redis_1.redis.set(refreshToken, JSON.stringify(newSession), "EX", secrets_1.REFRESH_TOKEN_EXPIRE);
    res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
    });
});
exports.updateAccessToken = updateAccessToken;
//-----------------------------------------------
//              Get User /me
//-----------------------------------------------
// Handling the me process
const me = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json(Object.assign({}, req.user));
});
exports.me = me;
