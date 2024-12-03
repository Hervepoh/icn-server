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
exports.summary = void 0;
const moment_1 = __importDefault(require("moment"));
const date_fns_1 = require("date-fns");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const formatter_1 = require("../libs/utils/formatter");
const summary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { from: fromDate, to: toDate, type, user } = req.query;
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
    let currentPeriod;
    if (type && user && (type === 'createdBy' || type === 'assignTo')) {
        // Logique lorsque type est 'createdBy' ou 'assignTo'
        currentPeriod = yield fetchSummaryData(from, to, type, user.toString());
    }
    else {
        // Gérer le cas où type n'est pas valide
        currentPeriod = yield fetchSummaryData(from, to);
    }
    const group_transactions = yield fetchSummaryGobalData(from, to);
    const group_transactions_by_region = group_transactions.per_region.map((item) => ({
        region: item.region,
        status: item.status,
        number: typeof item.number === 'bigint' ? Number(item.number) : item.number,
        amount: typeof item.amount === 'bigint' ? Number(item.amount) : item.amount,
    }));
    const group_transactions_by_unit = group_transactions.per_unit.map((item) => ({
        region: item.region,
        unit: item.unit,
        status: item.status,
        number: typeof item.number === 'bigint' ? Number(item.number) : item.number,
        amount: typeof item.amount === 'bigint' ? Number(item.amount) : item.amount,
    }));
    const group_transactions_region = group_transactions.region.map((item) => ({
        name: item.region,
        value: typeof item.number === 'bigint' ? Number(item.number) : item.number,
    }));
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
    const formattedCategoriesData = currentPeriod.transactions.map((item) => ({
        name: item.status,
        value: typeof item.number === 'bigint' ? Number(item.number) : item.number,
    }));
    return res.status(200).json({
        success: true,
        data: {
            days: formattedDaysData,
            group: {
                by_region: group_transactions_by_region,
                by_unit: group_transactions_by_unit,
            },
            transactions: { nber: formattedTransactionsData },
            categories: { nber: formattedCategoriesData },
            regions: group_transactions_region,
            dateRangeLabel: (0, formatter_1.formatDateRange)({ from, to })
        }
    });
});
exports.summary = summary;
function fetchSummaryData(from, to, type, userIdOrCreatedBy) {
    return __awaiter(this, void 0, void 0, function* () {
        const fromDate = (0, date_fns_1.format)(from, "yyyy-MM-dd");
        const toDate = (0, date_fns_1.format)(to, "yyyy-MM-dd");
        const filter = `${type === 'createdBy' && userIdOrCreatedBy ? `createdBy='${userIdOrCreatedBy}' AND ` : ''}${type === 'assignTo' && userIdOrCreatedBy ? `userId='${userIdOrCreatedBy}' AND ` : ''}`;
        // Requête pour les jours actifs
        const activeDaysQuery = `
    SELECT 
      DATE(paymentDate) AS date, 
      COUNT(*) AS count, 
      SUM(amount) AS amount
    FROM transactions
    WHERE 
      deleted = 0 AND 
      statusId <> 2 AND ${filter}
      paymentDate BETWEEN '${fromDate}' AND '${toDate}' 
    GROUP BY DATE(paymentDate) 
    ORDER BY date ASC
  `;
        const activeDays = yield prismadb_1.default.$queryRawUnsafe(activeDaysQuery);
        const days = fillMissingDays(activeDays, from, to);
        // Requête pour les transactions
        const transactionsQuery = `
    SELECT 
      s.name AS status, 
      COUNT(*) AS number,
      SUM(t.amount) AS amount
    FROM 
      transactions t
    JOIN 
        status s ON t.statusId = s.id
    WHERE
        t.deleted = 0 AND
        statusId <> 2 AND ${filter}
        paymentDate BETWEEN '${fromDate}' AND '${toDate}'
    GROUP BY 
        t.statusId;
  `;
        const transactions = yield prismadb_1.default.$queryRawUnsafe(transactionsQuery);
        return {
            days,
            transactions,
        };
    });
}
function fetchSummaryGobalData(from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const fromDate = (0, date_fns_1.format)(from, "yyyy-MM-dd");
        const toDate = (0, date_fns_1.format)(to, "yyyy-MM-dd");
        const region_Query = `
  SELECT 
    r.name as region,
    COUNT(*) AS number,
    SUM(t.amount) AS amount
  FROM 
    transactions t
  JOIN 
      regions r ON t.regionId = r.id
  JOIN 
      status s ON t.statusId = s.id
  WHERE
      t.deleted = 0 AND
      t.statusId <> 2 AND 
      t.paymentDate BETWEEN '${fromDate}' AND '${toDate}'
  GROUP BY 
      t.regionId;
`;
        const region = yield prismadb_1.default.$queryRawUnsafe(region_Query);
        const transactions_per_region_Query = `
  SELECT 
    r.name as region,
    s.name AS status, 
    COUNT(*) AS number,
    SUM(t.amount) AS amount
  FROM 
    transactions t
  JOIN 
      regions r ON t.regionId = r.id
  JOIN 
      status s ON t.statusId = s.id
  WHERE
      t.deleted = 0 AND
      t.statusId <> 2 AND 
      t.paymentDate BETWEEN '${fromDate}' AND '${toDate}'
  GROUP BY 
      t.regionId,t.statusId;
`;
        const per_region = yield prismadb_1.default.$queryRawUnsafe(transactions_per_region_Query);
        const transactions_per_unit_Query = `
  SELECT 
    r.name as region,
    u.name as unit,
    s.name AS status, 
    COUNT(*) AS number,
    SUM(t.amount) AS amount
  FROM 
    transactions t
  JOIN 
      units u ON t.unitId = u.id
  JOIN 
      regions r ON t.regionId = r.id
  JOIN 
      status s ON t.statusId = s.id
  WHERE
      t.deleted = 0 AND
      t.statusId <> 2 AND 
      t.paymentDate BETWEEN '${fromDate}' AND '${toDate}'
  GROUP BY 
     r.name, u.name, s.name;
`;
        const per_unit = yield prismadb_1.default.$queryRawUnsafe(transactions_per_unit_Query);
        return {
            region,
            per_region,
            per_unit
        };
    });
}
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
