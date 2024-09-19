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
const roles = ['ADMIN', 'USER', 'ASSIGNATOR', 'VALIDATOR', 'MANAGER'];

// Liste des permissions
const services = Object.values(serviceType);
const permissions = [
  'CREATE', 'READ', 'WRITE', 'UPDATE', 'DELETE', 'BULKCREATE', 'BULKDELETE'
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
];

async function main() {
  console.log(`##########################`);
  console.log(`##      Start seeding   ##`);
  console.log(`##########################`);

  // Clean redis cache
  redis.flushdb();

  console.log(`Cache cleared.`);

  // Vider les tables
  await prisma.status.deleteMany({});
  await prisma.bank.deleteMany({});
  await prisma.connectionHistory.deleteMany({});
  await prisma.internalNotification.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.paymentMode.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.transactionDetail.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.user.deleteMany({});

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

  // (Optionnel) Associer les rôles aux utilisateurs
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

  for (const user of createdUsers) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: createdRoles[1].id,
      }
    });
  }

  // (Optionnel) Associer certaines permissions aux rôles
  for (const role of createdRoles) {
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
  }

  // Créer les status
  const statusPromises = status.map(item =>
    prisma.status.create({
      data: { name: item },
    })
  );
  const createdStatus = await Promise.all(statusPromises);
  console.log(`Created status: ${status.join(', ')}`);

  console.log(`##########################`);
  console.log(`##   Seeding finished.  ##`);
  console.log(`##########################`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });