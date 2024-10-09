import { NextFunction, Request, Response } from "express";
import moment from "moment";
import {
  eachDayOfInterval,
  differenceInDays,
  format,
  isSameDay,
  subDays,
} from "date-fns";
import prismaClient from "../libs/prismadb";
import { formatDateRange } from "../libs/utils/formatter";


export const summary = async (req: Request, res: Response, next: NextFunction) => {

  const { from: fromDate, to: toDate, type, user } = req.query;

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 30);

  const from = fromDate
    ? moment(fromDate.toString(), "YYYY-MM-DD").toDate()
    : defaultFrom;
  const to = toDate
    ? moment(toDate.toString(), "YYYY-MM-DD").toDate()
    : defaultTo;

  //Get the number of full days between the end and start dates.
  const periodLenght = differenceInDays(to, from) + 1;

  //Last period date for data comparaison with current date
  const lastPeriodFrom = subDays(from, periodLenght);
  const lastPeriodTo = subDays(to, periodLenght);

  let currentPeriod;
  if (type && user && (type === 'createdBy' || type === 'assignTo')) {
    // Logique lorsque type est 'createdBy' ou 'assignTo'
    currentPeriod = await fetchSummaryData(from, to, type, user.toString());
  } else {
    // Gérer le cas où type n'est pas valide
    currentPeriod = await fetchSummaryData(from, to);
  }

  //const lastPeriod = await fetchSummaryData(from, to);
  // Convert BigInt to Number
  const formattedDaysData = currentPeriod.days.map(item => ({
    date: item.date,
    number: typeof item.number === 'bigint' ? Number(item.number) : item.number,
    amount: typeof item.number === 'bigint' ? Number(item.amount) : item.amount,
  }));
  const formattedTransactionsData = currentPeriod.transactions.map((item: { status: any; number: any; amount: any; }) => ({
    status: item.status,
    value: typeof item.number === 'bigint' ? Number(item.number) : item.number,
    amount: typeof item.number === 'bigint' ? Number(item.number) : item.number,
  })).reduce((acc: { [x: string]: any; }, curr: { status: string | number; value: any; }) => {
    acc[curr.status] = curr.value;
    return acc;
  }, {});;
  const formattedCategoriesData = currentPeriod.transactions.map((item: { status: any; number: any; amount: any; }) => ({
    name: item.status,
    value: typeof item.number === 'bigint' ? Number(item.number) : item.number,
  }));
  return res.status(200).json({
    success: true,
    data: {
      days: formattedDaysData,
      transactions: { nber: formattedTransactionsData },
      categories: { nber: formattedCategoriesData },
      dateRangeLabel:formatDateRange({ from, to })
    }
  });

};

type FilterType = 'createdBy' | 'assignTo';

async function fetchSummaryData(from: Date, to: Date, type?: FilterType, userIdOrCreatedBy?: string) {
  const fromDate = format(from, "yyyy-MM-dd");
  const toDate = format(to, "yyyy-MM-dd");

  const filter =
    `${type === 'createdBy' && userIdOrCreatedBy ? `createdBy='${userIdOrCreatedBy}' AND ` : ''}${type === 'assignTo' && userIdOrCreatedBy ? `userId='${userIdOrCreatedBy}' AND ` : ''}`;

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
  `
  const activeDays: any = await prismaClient.$queryRawUnsafe(activeDaysQuery);

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
  `

  const transactions: any = await prismaClient.$queryRawUnsafe(transactionsQuery);

  return {
    days,
    transactions,
  };
}


function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return previous === current ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

function fillMissingDays(
  activeDays: { date: string; count: number; amount: number }[],
  startDate: Date,
  endDate: Date
): { date: Date; number: number; amount: number }[] {
  if (activeDays.length === 0) return [];
  const allDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const transactionsByDay = allDays.map((day) => {
    const found = activeDays.find((d) => isSameDay(d.date, day));
    if (found) {
      return {
        date: day,
        number: found.count,
        amount: found.amount,
      };
    } else {
      return {
        date: day,
        number: 0,
        amount: 0,
      };
    }
  });

  return transactionsByDay;
}
