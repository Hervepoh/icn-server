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
exports.me = exports.all = void 0;
const moment_1 = __importDefault(require("moment"));
const date_fns_1 = require("date-fns");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const http_exception_1 = require("../exceptions/http-exception");
const all = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { from: fromDate, to: toDate } = req.query;
    const defaultTo = new Date();
    const defaultFrom = (0, date_fns_1.subDays)(defaultTo, 30);
    const from = fromDate
        ? (0, moment_1.default)(fromDate.toString(), "YYYY-MM-DD").toDate()
        : defaultFrom;
    const to = toDate
        ? (0, moment_1.default)(toDate.toString(), "YYYY-MM-DD").toDate()
        : defaultTo;
    //Get the number of full days between the end and start dates.
    const periodLenght = (0, date_fns_1.differenceInDays)(to, from) + 1;
    //Last period date for data comparaison with current date
    const lastPeriodFrom = (0, date_fns_1.subDays)(from, periodLenght);
    const lastPeriodTo = (0, date_fns_1.subDays)(to, periodLenght);
    try {
    }
    catch (error) {
        next(new bad_requests_1.default("Error in call", http_exception_1.ErrorCode.UNAUTHORIZE));
    }
    const currentPeriod = yield fetchSummaryData(from, to);
    //const lastPeriod = await fetchSummaryData(from, to);
    // Convert BigInt to Number
    const formattedDaysData = currentPeriod.days.map(item => ({
        date: item.date,
        number: typeof item.number === 'bigint' ? Number(item.number) : item.number,
        amount: typeof item.number === 'bigint' ? Number(item.amount) : item.amount,
    }));
    const formattedTransactionsData = currentPeriod.transactions.map((item) => ({
        status: item.status,
        value: typeof item.number === 'bigint' ? Number(item.number) : item.number,
        amount: typeof item.number === 'bigint' ? Number(item.number) : item.number,
    })).reduce((acc, curr) => {
        acc[curr.status] = curr.value;
        return acc;
    }, {});
    ;
    const formattedCategoriesData = currentPeriod.transactions.map((item) => ({
        name: item.status,
        value: typeof item.number === 'bigint' ? Number(item.number) : item.number,
    }));
    return res.status(200).json({
        success: true,
        data: {
            days: formattedDaysData,
            transactions: { nber: formattedTransactionsData },
            categories: { nber: formattedCategoriesData }
        }
    });
});
exports.all = all;
function fetchSummaryData(from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(format(new Date(from), "yyyy-MM-dd"));
        const activeDays = yield prismadb_1.default.$queryRaw `
    SELECT DATE(paymentDate) AS date , COUNT(*) AS count, SUM(amount) AS amount
    FROM transactions
    WHERE  
    deleted=0 AND
    paymentDate BETWEEN '2021-08-01' AND '2025-08-01'
    GROUP BY DATE(paymentDate)
    ORDER BY date ASC;
`;
        const days = fillMissingDays(activeDays, from, to);
        const transactions = yield prismadb_1.default.$queryRaw `
      SELECT 
          s.name AS status, 
          COUNT(*) AS number,
          SUM(t.amount) AS amount
      FROM 
          transactions t
      JOIN 
          status s ON t.statusId = s.id
      WHERE
          t.paymentDate BETWEEN '2021-08-01' AND '2025-08-01'
      GROUP BY 
          t.statusId;
`;
        return {
            days,
            transactions,
        };
    });
}
const me = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //     // const from = new Date(req.body.from);
    //     // const to = new Date(req.body.to);
    //     const from = moment(req.body.from, 'DD/MM/YYYY').toDate();
    //     const to = moment(req.body.to, 'DD/MM/YYYY').toDate();
    //     const userId = req.user?.id;
    //     // Récupération du nombre de requêtes par statut
    //     const requestCountByStatus = await requestModel.aggregate([
    //       { $match: { payment_date: { $gte: from, $lte: to }, userId } },
    //       { $group: { id: '$status', count: { $count: {} } } }
    //     ]);
    //     console.log("Voici", res.cookie)
    //     // Récupération du nombre total de requêtes
    //     const totalRequestCount = await requestModel.countDocuments({ payment_date: { $gte: from, $lte: to }, userId });
    //     // Récupération du montant des requêtes par statut
    //     const amountByStatus = await requestModel.aggregate([
    //       { $match: { createdAt: { $gte: from, $lte: to }, userId } },
    //       { $group: { id: '$status', totalAmount: { $sum: '$amount' } } }
    //     ]);
    //     // Récupération des 10 principaux demandeurs de requêtes par statut
    //     // Étape 1: Récupérer les demandes dans la plage de dates spécifiée
    //     const requests = await prismaClient.tra.findMany({
    //       where: {
    //         createdAt: {
    //           gte: from,  // Date de début
    //           lte: to,    // Date de fin
    //         },
    //         userId: userId,  // Filtrer par userId
    //       },
    //       select: {
    //         status: true,
    //         userId: true,
    //       },
    //     });
    //     // Étape 2: Compter les demandes par utilisateur et statut
    //     const requesterCounts = requests.reduce((acc: { [x: string]: any; }, { status, userId }: any) => {
    //       const key = `${status}_${userId}`;
    //       acc[key] = (acc[key] || 0) + 1;
    //       return acc;
    //     }, {});
    //     // Étape 3: Regrouper par statut
    //     const groupedByStatus = Object.entries(requesterCounts).reduce((acc, [key, count]) => {
    //       const [status, userId] = key;
    //       if (!acc[status]) {
    //         acc[status] = [];
    //       }
    //       acc[status].push({ userId, count });
    //       return acc;
    //     }, {});
    //     // Étape 4: Obtenir les 10 meilleurs demandeurs par statut
    //     const topRequestersByStatus = Object.keys(groupedByStatus).map(status => ({
    //       status,
    //       topRequesters: groupedByStatus[status]
    //         .sort((a: { count: number; }, b: { count: number; }) => b.count - a.count) // Trier par compte
    //         .slice(0, 10) // Prendre les 10 meilleurs
    //     }));
    //     // Afficher le résultat
    //     console.log(topRequestersByStatus);
    //     return res.status(200).json({
    //       success: true,
    //       data: {
    //         requestCountByStatus,
    //         totalRequestCount,
    //         amountByStatus,
    //         topRequestersByStatus
    //       }
    //     });
});
exports.me = me;
function calculatePercentageChange(current, previous) {
    if (previous === 0) {
        return previous === current ? 0 : 100;
    }
    return ((current - previous) / previous) * 100;
}
function fillMissingDays(activeDays, startDate, endDate) {
    if (activeDays.length === 0)
        return [];
    const allDays = (0, date_fns_1.eachDayOfInterval)({
        start: startDate,
        end: endDate,
    });
    const transactionsByDay = allDays.map((day) => {
        const found = activeDays.find((d) => (0, date_fns_1.isSameDay)(d.date, day));
        if (found) {
            return {
                date: day,
                number: found.count,
                amount: found.amount,
            };
        }
        else {
            return {
                date: day,
                number: 0,
                amount: 0,
            };
        }
    });
    return transactionsByDay;
}
