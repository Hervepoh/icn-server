import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { serviceType } from '../src/constants/enum';
import { SALT_ROUNDS } from '../src/secrets';
import { redis } from '../src/libs/utils/redis';

const prisma = new PrismaClient();

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
const services = Object.values(serviceType);
const permissions = [
  'CREATE', 'READ', 'WRITE', 'UPDATE', 'DELETE', 'BULKCREATE', 'BULKDELETE', 'SEARCH'
];
const customPermissions = [
  "ICN-NEXTCODE", 'ICN-NEXTDEMATERIALIZATION', "ICN-GROUPES", "ICN-DOCUMENTS",
  "USER-READNOTIFICATION", "USER-ROLE", "USER-ADDROLE", "USER-REMOVEROLE", "USER-NOTIFICATION",
   "TRANSACTION-PUBLISH","TRANSACTION-VALIDATE","TRANSACTION-ASSIGN"
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
const specificPermissionForAssignator = ["SUMMARY-READ","TRANSACTION-READ", "TRANSACTION-ASSIGN" ,"USER-SEARCH"];
const specificPermissionForValidation = ["SUMMARY-READ","TRANSACTION-READ", "TRANSACTION-VALIDATE"];
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


const servicePermissions = services.flatMap(service =>
  permissions.map(permission => `${service}-${permission}`)
);

// Données des utilisateurs
const users: Prisma.UserCreateInput[] = [
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

async function main() {
  console.log(`##########################`);
  console.log(`##      Start seeding   ##`);
  console.log(`##########################`);

  // Clean redis cache
  redis.flushdb();

  console.log(`Cache cleared.`);

  // Vider les tables

  await prisma.audit.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.transactionDetail.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.paymentMode.deleteMany({});
  await prisma.status.deleteMany({});
  await prisma.bank.deleteMany({});
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
  await prisma.$executeRaw`TRUNCATE TABLE status`;
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

  console.log(`Tables cleared.`);

  // Créer les Banques
  const bankPromises = banks.map(item =>
    prisma.bank.create({
      data: { name: item },
    })
  );
  const createdBanks = await Promise.all(bankPromises);
  console.log(`Created banks: ${banks.join(', ')}`);
  createdBanks.forEach(item => {
    console.log(`Created payment Mode with id: ${item.id}`);
  });
  /////////////////////////////////////

  // Créer les Banques
  const payModePromises = paymentModes.map(item =>
    prisma.paymentMode.create({
      data: { name: item },
    })
  );
  const createdPaymentModes = await Promise.all(payModePromises);
  console.log(`Created paymentModes: ${paymentModes.join(', ')}`);
  createdPaymentModes.forEach(item => {
    console.log(`Created payment Mode with id: ${item.id}`);
  });
  /////////////////////////////////////

  // Créer les permissions
  const permissionPromises = servicePermissions.map(permission =>
    prisma.permission.create({
      data: { name: permission! },
    })
  );
  const createdPermissions = await Promise.all(permissionPromises);
  console.log(`Created permissions: ${servicePermissions.join(', ')}`);
  createdPermissions.forEach(item => {
    console.log(`Created permission with id: ${item.id}`);
  });

  const customPermissionsPromises = customPermissions.map(item =>
    prisma.permission.create({
      data: { name: item },
    })
  );
  const createdCustomPermissions = await Promise.all(customPermissionsPromises);
  createdCustomPermissions.forEach(item => {
    console.log(`Created permission with id: ${item.id}`);
  });
  /////////////////////////////////////

  // Créer les roles
  const rolePromises = roles.map(role =>
    prisma.role.create({
      data: { name: role },
    })
  );
  const createdRoles = await Promise.all(rolePromises);
  console.log(`Created roles: ${roles.join(', ')}`);
  createdRoles.forEach(item => {
    console.log(`Created role with id: ${item.id}`);
  });
  /////////////////////////////////////

  // Créer les utilisateurs
  const userPromises = users.map(async u =>
    prisma.user.create({
      data: {
        ...u,
        password: await bcrypt.hash(u.password, parseInt(SALT_ROUNDS || '10')!)
      },
    })
  );
  const createdUsers = await Promise.all(userPromises);
  createdUsers.forEach(user => {
    console.log(`Created user with id: ${user.id}`);
  });
  /////////////////////////////////////

  // (Optionnel) Associer les rôles aux utilisateurs
  //Pour l' ADMIN
  const USER_ADMIN = await prisma.user.findFirst({
    where: { name: "admin" }
  })
  const ROLE_ADMIN = await prisma.role.findFirst({
    where: { name: "ADMIN" }
  })
  if (USER_ADMIN && ROLE_ADMIN) {
    await prisma.userRole.create({
      data: {
        userId: USER_ADMIN.id,
        roleId: ROLE_ADMIN.id,
      }
    });
    console.log(`ROLE ${ROLE_ADMIN.name}  assign to the user ${USER_ADMIN.name}`);
  }
  //FOR VALIDATOR
  const USER_VALIDATOR = await prisma.user.findFirst({
    where: { name: "validateur" }
  })
  const ROLE_VALIDATOR = await prisma.role.findFirst({
    where: { name: "VALIDATOR" }
  })
  if (USER_VALIDATOR && ROLE_VALIDATOR) {
    await prisma.userRole.create({
      data: {
        userId: USER_VALIDATOR.id,
        roleId: ROLE_VALIDATOR.id,
      }
    });
    console.log(`ROLE ${ROLE_VALIDATOR.name}  assign to the user ${USER_VALIDATOR.name}`);
  }

  //FOR VALIDATOR
  const USER_COMMERCIAL = await prisma.user.findFirst({
    where: { name: "commercial" }
  })
  const ROLE_COMMERCIAL = await prisma.role.findFirst({
    where: { name: "COMMERCIAL" }
  })
  if (USER_COMMERCIAL && ROLE_COMMERCIAL) {
    await prisma.userRole.create({
      data: {
        userId: USER_COMMERCIAL.id,
        roleId: ROLE_COMMERCIAL.id,
      }
    });
    console.log(`ROLE ${ROLE_COMMERCIAL.name}  assign to the user ${USER_COMMERCIAL.name}`);
  }

  //FOR ASSIGNATOR
  const USER_ASSIGNATOR = await prisma.user.findFirst({
    where: { name: "assignateur" }
  })
  const ROLE_ASSIGNATOR = await prisma.role.findFirst({
    where: { name: "ASSIGNATOR" }
  })
  if (USER_ASSIGNATOR && ROLE_ASSIGNATOR) {
    await prisma.userRole.create({
      data: {
        userId: USER_ASSIGNATOR.id,
        roleId: ROLE_ASSIGNATOR.id,
      }
    });
    console.log(`ROLE ${ROLE_ASSIGNATOR.name}  assign to the user ${USER_ASSIGNATOR.name}`);
  }

  //FOR ALL USER
  for (const user of createdUsers.slice(0, 4)) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: createdRoles[1].id,
      }
    });
  }

  // (Optionnel) Associer les permissions aux rôles
  for (const role of createdRoles.slice(0, 1)) {
    for (const permission of createdPermissions) {
      const db = await prisma.permission.findUnique({
        where: { name: permission.name }
      })
      if (db) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: db.id,
          }
        });
      }

    }
    for (const permission of createdCustomPermissions) {
      const db = await prisma.permission.findUnique({
        where: { name: permission.name }
      })
      if (db) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: db.id,
          }
        });
      }

    }
  }

  // role spécial pour les simples utilisateurs
  const ROLE_USER = await prisma.role.findFirst({
    where: { name: "USER" }
  })
  if (ROLE_USER) {
    for (const name of specificPermissionForUSER) {
      const db = await prisma.permission.findUnique({
        where: { name: name }
      })

      if (db) {
        await prisma.rolePermission.create({
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
      const db = await prisma.permission.findUnique({
        where: { name: name }
      })

      if (db) {
        await prisma.rolePermission.create({
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
      const db = await prisma.permission.findUnique({
        where: { name: name }
      })

      if (db) {
        await prisma.rolePermission.create({
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
      const db = await prisma.permission.findUnique({
        where: { name: name }
      })

      if (db) {
        await prisma.rolePermission.create({
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
      const created = await prisma.status.create({
          data: { name: item },
      });
      createdStatus.push(created);
  }
  console.log(`Created status: ${createdStatus.map(s => s.name).join(', ')}`);


  console.log(`##########################`);
  console.log(`##   Seeding finished.  ##`);
  console.log(`##########################`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(1);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });