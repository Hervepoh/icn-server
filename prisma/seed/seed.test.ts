import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
// Create transactions based on created users
const totalTransactions = 100; 

// Create transactions based on created users
const transactions = Array.from({ length: totalTransactions }, (_, index) => {
    const user = createdUsers[index % createdUsers.length];
    const bank = createdBanks[index % createdBanks.length];
    const paymentMode = createdPaymentModes[index % createdPaymentModes.length];

    // Vérifie si l'utilisateur, la banque et le mode de paiement sont définis
    if (!user || !bank || !paymentMode) {
        console.error(`Missing data for transaction at index: ${index}`);
        return null;
    }

    return {
        reference: `TX${index + 1}`,
        userId: user.id,
        name: `Transaction ${index + 1}`,
        amount: parseFloat((Math.random() * 1000 + 50).toFixed(2)),
        bankId: bank.id,
        paymentDate: new Date(Date.now() - Math.random() * 10000000000),
        paymentModeId: paymentMode.id,
        statusId: Math.floor(Math.random() * statuses.length) + 1,
        createdBy: user.id,
    };
});
