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
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const enum_1 = require("../src/constants/enum");
const secrets_1 = require("../src/secrets");
const redis_1 = require("../src/libs/utils/redis");
const prisma = new client_1.PrismaClient();
//Liste des services tracker par redis
// Liste des moyens de paiement
const paymentModes = ['CHECQUE', 'COMPENSATION', 'VIREMENT'];
// Liste des banques
const banks = ['UBA', 'SGC', 'BGFI', 'NFC', 'BICEC', 'BEAC'];
// Liste des rôles
const status = [
    'deleted',
    "draft",
    "initiated",
    "validated",
    "rejected",
    "pending_commercial_input",
    "pending_finance_validation",
    "processing",
    "treated"
];
// Liste des rôles
const roles = ['ADMIN', 'USER', 'VALIDATOR', 'ASSIGNATOR', 'COMMERCIAL', 'MANAGER'];
// Liste des permissions
const services = Object.values(enum_1.serviceType);
const permissions = [
    'CREATE', 'READ', 'WRITE', 'UPDATE', 'DELETE', 'BULKCREATE', 'BULKDELETE', 'SEARCH'
];
const customPermissions = [
    "ICN-NEXTCODE", 'ICN-NEXTDEMATERIALIZATION', "ICN-GROUPES", "ICN-DOCUMENTS",
    "USER-READNOTIFICATION", "USER-ROLE", "USER-ADDROLE", "USER-REMOVEROLE", "USER-NOTIFICATION",
    "TRANSACTION-PUBLISH", "TRANSACTION-VALIDATE", "TRANSACTION-ASSIGN"
];
// Permissions spécifique a attribuer par pofil
const specificPermissionForCOMMERCIAL = [
    "TRANSACTION-READ",
    "TRANSACTIONDETAIL-READ", "TRANSACTIONDETAIL-WRITE", "TRANSACTIONDETAIL-BULKCREATE", "TRANSACTIONDETAIL-BULKDELETE",
    "SUMMARY-READ",
    "BANK-READ",
    "PAYMENTMODE-READ",
    "UNPAID-SEARCH",
    "ICN-READ",
    "ROLE-READ",
    "USER-READNOTIFICATION"
];
const specificPermissionForAssignator = ["SUMMARY-READ", "TRANSACTION-READ", "TRANSACTION-ASSIGN", "USER-SEARCH"];
const specificPermissionForValidation = ["SUMMARY-READ", "TRANSACTION-READ", "TRANSACTION-VALIDATE"];
const specificPermissionForUSER = [
    "TRANSACTION-READ", "TRANSACTION-WRITE", "TRANSACTION-PUBLISH", "TRANSACTION-BULKCREATE",
    "SUMMARY-READ",
    "BANK-READ",
    "PAYMENTMODE-READ",
    "UNPAID-SEARCH",
    "ICN-READ",
    "ROLE-READ",
    "USER-READNOTIFICATION"
];
const servicePermissions = services.flatMap(service => permissions.map(permission => `${service}-${permission}`));
// Données des utilisateurs
const users = [
    {
        name: 'admin',
        email: 'admin@eneo.cm',
        password: 'admin'
    },
    {
        name: 'Alice',
        email: 'alice@eneo.cm',
        password: 'password'
    },
    {
        name: 'Aline',
        email: 'aline@eneo.cm',
        password: 'password'
    },
    {
        name: 'Nilu',
        email: 'nilu@eneo.cm',
        password: 'password'
    },
    {
        name: 'Mahmoud',
        email: 'mahmoud@eneo.cm',
        password: 'password'
    },
    {
        name: 'validateur',
        email: 'validateur@eneo.cm',
        password: 'password'
    },
    {
        name: 'assignateur',
        email: 'assignateur@eneo.cm',
        password: 'password'
    },
    {
        name: 'commercial',
        email: 'commercial@eneo.cm',
        password: 'password'
    },
];
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`##########################`);
        console.log(`##      Start seeding   ##`);
        console.log(`##########################`);
        // Clean redis cache
        redis_1.redis.flushdb();
        console.log(`Cache cleared.`);
        // Vider les tables
        yield prisma.audit.deleteMany({});
        yield prisma.notification.deleteMany({});
        yield prisma.userRole.deleteMany({});
        yield prisma.rolePermission.deleteMany({});
        yield prisma.permission.deleteMany({});
        yield prisma.role.deleteMany({});
        yield prisma.transactionDetail.deleteMany({});
        yield prisma.transaction.deleteMany({});
        yield prisma.user.deleteMany({});
        yield prisma.paymentMode.deleteMany({});
        yield prisma.status.deleteMany({});
        yield prisma.bank.deleteMany({});
        yield prisma.$executeRaw `SET FOREIGN_KEY_CHECKS = 0`;
        yield prisma.$executeRaw `TRUNCATE TABLE status`;
        yield prisma.$executeRaw `SET FOREIGN_KEY_CHECKS = 1`;
        console.log(`Tables cleared.`);
        // Créer les Banques
        const bankPromises = banks.map(item => prisma.bank.create({
            data: { name: item },
        }));
        const createdBanks = yield Promise.all(bankPromises);
        console.log(`Created banks: ${banks.join(', ')}`);
        createdBanks.forEach(item => {
            console.log(`Created payment Mode with id: ${item.id}`);
        });
        /////////////////////////////////////
        // Créer les Banques
        const payModePromises = paymentModes.map(item => prisma.paymentMode.create({
            data: { name: item },
        }));
        const createdPaymentModes = yield Promise.all(payModePromises);
        console.log(`Created paymentModes: ${paymentModes.join(', ')}`);
        createdPaymentModes.forEach(item => {
            console.log(`Created payment Mode with id: ${item.id}`);
        });
        /////////////////////////////////////
        // Créer les permissions
        const permissionPromises = servicePermissions.map(permission => prisma.permission.create({
            data: { name: permission },
        }));
        const createdPermissions = yield Promise.all(permissionPromises);
        console.log(`Created permissions: ${servicePermissions.join(', ')}`);
        createdPermissions.forEach(item => {
            console.log(`Created permission with id: ${item.id}`);
        });
        const customPermissionsPromises = customPermissions.map(item => prisma.permission.create({
            data: { name: item },
        }));
        const createdCustomPermissions = yield Promise.all(customPermissionsPromises);
        createdCustomPermissions.forEach(item => {
            console.log(`Created permission with id: ${item.id}`);
        });
        /////////////////////////////////////
        // Créer les roles
        const rolePromises = roles.map(role => prisma.role.create({
            data: { name: role },
        }));
        const createdRoles = yield Promise.all(rolePromises);
        console.log(`Created roles: ${roles.join(', ')}`);
        createdRoles.forEach(item => {
            console.log(`Created role with id: ${item.id}`);
        });
        /////////////////////////////////////
        // Créer les utilisateurs
        const userPromises = users.map((u) => __awaiter(this, void 0, void 0, function* () {
            return prisma.user.create({
                data: Object.assign(Object.assign({}, u), { password: yield bcrypt_1.default.hash(u.password, parseInt(secrets_1.SALT_ROUNDS || '10')) }),
            });
        }));
        const createdUsers = yield Promise.all(userPromises);
        createdUsers.forEach(user => {
            console.log(`Created user with id: ${user.id}`);
        });
        /////////////////////////////////////
        // (Optionnel) Associer les rôles aux utilisateurs
        //Pour l' ADMIN
        const USER_ADMIN = yield prisma.user.findFirst({
            where: { name: "admin" }
        });
        const ROLE_ADMIN = yield prisma.role.findFirst({
            where: { name: "ADMIN" }
        });
        if (USER_ADMIN && ROLE_ADMIN) {
            yield prisma.userRole.create({
                data: {
                    userId: USER_ADMIN.id,
                    roleId: ROLE_ADMIN.id,
                }
            });
            console.log(`ROLE ${ROLE_ADMIN.name}  assign to the user ${USER_ADMIN.name}`);
        }
        //FOR VALIDATOR
        const USER_VALIDATOR = yield prisma.user.findFirst({
            where: { name: "validateur" }
        });
        const ROLE_VALIDATOR = yield prisma.role.findFirst({
            where: { name: "VALIDATOR" }
        });
        if (USER_VALIDATOR && ROLE_VALIDATOR) {
            yield prisma.userRole.create({
                data: {
                    userId: USER_VALIDATOR.id,
                    roleId: ROLE_VALIDATOR.id,
                }
            });
            console.log(`ROLE ${ROLE_VALIDATOR.name}  assign to the user ${USER_VALIDATOR.name}`);
        }
        //FOR VALIDATOR
        const USER_COMMERCIAL = yield prisma.user.findFirst({
            where: { name: "commercial" }
        });
        const ROLE_COMMERCIAL = yield prisma.role.findFirst({
            where: { name: "COMMERCIAL" }
        });
        if (USER_COMMERCIAL && ROLE_COMMERCIAL) {
            yield prisma.userRole.create({
                data: {
                    userId: USER_COMMERCIAL.id,
                    roleId: ROLE_COMMERCIAL.id,
                }
            });
            console.log(`ROLE ${ROLE_COMMERCIAL.name}  assign to the user ${USER_COMMERCIAL.name}`);
        }
        //FOR ASSIGNATOR
        const USER_ASSIGNATOR = yield prisma.user.findFirst({
            where: { name: "assignateur" }
        });
        const ROLE_ASSIGNATOR = yield prisma.role.findFirst({
            where: { name: "ASSIGNATOR" }
        });
        if (USER_ASSIGNATOR && ROLE_ASSIGNATOR) {
            yield prisma.userRole.create({
                data: {
                    userId: USER_ASSIGNATOR.id,
                    roleId: ROLE_ASSIGNATOR.id,
                }
            });
            console.log(`ROLE ${ROLE_ASSIGNATOR.name}  assign to the user ${USER_ASSIGNATOR.name}`);
        }
        //FOR ALL USER
        for (const user of createdUsers.slice(0, 4)) {
            yield prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: createdRoles[1].id,
                }
            });
        }
        // (Optionnel) Associer les permissions aux rôles
        for (const role of createdRoles.slice(0, 1)) {
            for (const permission of createdPermissions) {
                const db = yield prisma.permission.findUnique({
                    where: { name: permission.name }
                });
                if (db) {
                    yield prisma.rolePermission.create({
                        data: {
                            roleId: role.id,
                            permissionId: db.id,
                        }
                    });
                }
            }
            for (const permission of createdCustomPermissions) {
                const db = yield prisma.permission.findUnique({
                    where: { name: permission.name }
                });
                if (db) {
                    yield prisma.rolePermission.create({
                        data: {
                            roleId: role.id,
                            permissionId: db.id,
                        }
                    });
                }
            }
        }
        // role spécial pour les simples utilisateurs
        const ROLE_USER = yield prisma.role.findFirst({
            where: { name: "USER" }
        });
        if (ROLE_USER) {
            for (const name of specificPermissionForUSER) {
                const db = yield prisma.permission.findUnique({
                    where: { name: name }
                });
                if (db) {
                    yield prisma.rolePermission.create({
                        data: {
                            roleId: ROLE_USER.id,
                            permissionId: db.id,
                        }
                    });
                }
            }
        }
        // role spécial pour les validations
        if (ROLE_VALIDATOR) {
            for (const name of specificPermissionForValidation) {
                const db = yield prisma.permission.findUnique({
                    where: { name: name }
                });
                if (db) {
                    yield prisma.rolePermission.create({
                        data: {
                            roleId: ROLE_VALIDATOR.id,
                            permissionId: db.id,
                        }
                    });
                }
            }
        }
        // role spécial pour les assignateurs
        if (ROLE_ASSIGNATOR) {
            for (const name of specificPermissionForAssignator) {
                const db = yield prisma.permission.findUnique({
                    where: { name: name }
                });
                if (db) {
                    yield prisma.rolePermission.create({
                        data: {
                            roleId: ROLE_ASSIGNATOR.id,
                            permissionId: db.id,
                        }
                    });
                }
            }
        }
        // role spécial pour les commerciaux (KAM)
        if (ROLE_COMMERCIAL) {
            for (const name of specificPermissionForCOMMERCIAL) {
                const db = yield prisma.permission.findUnique({
                    where: { name: name }
                });
                if (db) {
                    yield prisma.rolePermission.create({
                        data: {
                            roleId: ROLE_COMMERCIAL.id,
                            permissionId: db.id,
                        }
                    });
                }
            }
        }
        // Créer les status
        const createdStatus = [];
        for (const item of status) {
            const created = yield prisma.status.create({
                data: { name: item },
            });
            createdStatus.push(created);
        }
        console.log(`Created status: ${createdStatus.map(s => s.name).join(', ')}`);
        console.log(`##########################`);
        console.log(`##   Seeding finished.  ##`);
        console.log(`##########################`);
    });
}
main()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
    process.exit(1);
}))
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));
