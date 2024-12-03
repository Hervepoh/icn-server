import { NextFunction, Request, Response } from "express";
import { format } from "date-fns";

import { sqlQuery } from "../constants/request";
import { isEmpty } from "../libs/utils/formatter";
import { executeQuery, getConnection, releaseConnection } from "../libs/utils/db.oracle";
import { LogLevel, LogType, writeLogEntry } from "../libs/utils/log";
import { ErrorCode } from "../exceptions/http-exception";
import BadRequestException from "../exceptions/bad-requests";


//---------------------------------------------------------
//              get all Unpaid Bills Using Query Parameters
//---------------------------------------------------------
export const getUnpaidBills = async (req: Request, res: Response, next: NextFunction) => {


  // Get Query Parameters
  const { by: searchBy, type } = req.query;
  const searchType: string = type?.toString() ?? "one";
  // check user information
  const authorizeSearchBy: string[] = ["invoice", "contract", "regroup", "customer"];
  const authorizeType: string[] = ["many", "one"];
  const orderBy: string[] = ["asc", "desc"];
  const limit: string[] = ["10", "50", "100"];
  if (!searchBy) throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);

  if (searchBy) {
    if (!authorizeSearchBy.includes(searchBy.toString())) {
      throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);
    }
    if (!authorizeType.includes(searchType.toString())) {
      throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);
    }
  }

  switch (searchBy) {
    case "invoice":
      getUnpaidBillsByInvoiceNumber(req, res, next);
      break;
    case "contract":
      getUnpaidBillsByContractNumber(req, res, next);
      break;
    case "regroup":
      getUnpaidBillsByCustomerRegroupNumber(req, res, next);
      break;
    case "customer":
      getUnpaidBillsByCustomerName(req, res, next);
      break;
    default:
      return res.status(200).json({
        success: true,
        bills: []
      });
      break;
  }
};


//---------------------------------------------------------
//              get all Unpaid Bills By Invoice Number 
//---------------------------------------------------------
export const getUnpaidBillsByInvoiceNumber =
  async (req: Request, res: Response, next: NextFunction) => {

    let connection;
    try {
      // Get Invoice Number from the query params 
      const { value: invoice_number } = req.query;

      // Validate invoice_number
      if (!invoice_number) {
        return res.status(200).json({
          success: true,
          bills: [],
          message: "Invalid invoice is required"
        });
      }

      // Check for characters (allowing only numeric characters)
      const isValidInvoiceNumber = /^\d+$/.test(invoice_number.toString());
      if (!isValidInvoiceNumber) {
        return res.status(200).json({
          success: false,
          bills: [],
          message: 'Invoice number must be numeric and cannot contain special characters'
        });
      }

      // Fetch data from the database
      connection = await getConnection();
      const result = await connection.execute(
        sqlQuery.unpaid_bills_by_invoice_number,
        [invoice_number.toString().trim()]
      );

      // send the response
      res.status(200).json({
        success: true,
        bills: result.rows
      });
    } catch (error: any) {
      // Catch the error and return and error respons
      writeLogEntry('Internal error:', LogLevel.ERROR, LogType.DATABASE, error.message);
      console.log("UNPAID-INVOICE",error)
      return res.status(200).json({
        success: false,
        bills: [],
        message: 'Internal error'
      });
      // throw new InternalException(error.message, error, ErrorCode.INTERNAL_EXCEPTION);
    } finally {
      // close the connection to the database
      if (connection) {
        await releaseConnection(connection);
      }
    }
  };


//---------------------------------------------------------
//              get all Unpaid Bills By Contract Number 
//---------------------------------------------------------
export const getUnpaidBillsByContractNumber =
  async (req: Request, res: Response, next: NextFunction) => {

    // Get date param from query parameters
    const { value: contract_number, from: FromDate, to: ToDate } = req.query;

    if (!FromDate || !ToDate) {
      return res.status(200).json({
        success: true,
        bills: [],
        message: "You must provide a period"
      });
    }

    if (!contract_number) {
      return res.status(200).json({
        success: true,
        bills: [],
        message: "Contract number is required"
      });
    }

    const isValidContractNumber = /^\d+$/.test(contract_number.toString());
    if (!isValidContractNumber) {
      return res.status(200).json({
        success: false,
        bills: [],
        message: 'Contract number must be numeric and cannot contain special characters'
      });
    }

    try {
      // Fetch data from the database
      const result = await executeQuery(
        sqlQuery.unpaid_bills_by_contract_number,
        [
          contract_number.toString().trim(),
          format(FromDate.toString() ?? new Date(), "dd/MM/yyyy"),
          format(ToDate.toString() ?? new Date(), "dd/MM/yyyy")
        ]
      );    // send the response
      return res.status(200).json({
        success: true,
        bills: result.rows
      });
    } catch (error: any) {
      // Catch the error and return and error respons
      writeLogEntry('Internal error:', LogLevel.ERROR, LogType.DATABASE, error);
      console.log("UNPAID-CONTRACT",error)
      return res.status(200).json({
        success: false,
        bills: [],
        message: 'Internal error'
      });
    }

  };


//---------------------------------------------------------
//              get all Unpaid Bills By CustomerRegroup Number 
//---------------------------------------------------------
export const getUnpaidBillsByCustomerRegroupNumber =
  async (req: Request, res: Response, next: NextFunction) => {
    const { value, from: FromDate, to: ToDate } = req.query;

    if (!FromDate || !ToDate) {
      return res.status(200).json({
        success: true,
        bills: [],
        message: "You must provide a period"
      });
    }

    if (!value) {
      return res.status(200).json({
        success: true,
        bills: [],
        message: "Customer Regroup number is required"
      });
    }
    // Fetch data from the database
    try {
      const result = await executeQuery(
        sqlQuery.unpaid_bills_by_customer_regroup_number,
        [
          value.toString().trim(), 
          format(FromDate.toString() ?? new Date(), "dd/MM/yyyy"),
          format(ToDate.toString() ?? new Date(), "dd/MM/yyyy")
        ]
      );
      console.log(result);
      return res.status(200).json({
        success: true,
        bills: result.rows
      });
    } catch (error: any) {
      writeLogEntry('Internal error:', LogLevel.ERROR, LogType.DATABASE, error);
      console.log("UNPAID-REGROUP",error)
      return res.status(200).json({
        success: false,
        bills: [],
        message: 'Internal error'
      });
    }

  };

//---------------------------------------------------------
//              get all Unpaid Bills By Customer Name
//---------------------------------------------------------
export const getUnpaidBillsByCustomerName =
  async (req: Request, res: Response, next: NextFunction) => {
    const { value, from: FromDate, to: ToDate } = req.query;

    // TODO :  Define the contraint due to params
    if (isEmpty(value) || isEmpty(FromDate) || isEmpty(ToDate)) {
      throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);
    }

    if (!FromDate || !ToDate) {
      throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);
    }
    // console.log("value", [
    //   value,
    //   format(FromDate.toString(), "dd/MM/yyyy"),
    //   format(ToDate.toString(), "dd/MM/yyyy")
    // ])

    // Fetch data from the database
    try {
      const result = await executeQuery(sqlQuery.unpaid_bills_by_customer_name, [value, FromDate.toString(), ToDate.toString()]);

      return res.status(200).json({
        success: true,
        bills: result.rows
      });
    } catch (error) {
      return res.status(500).json({
        success: false
      });
    }

  };

//---------------------------------------------------------
//              get all Unpaid Bills On List
//---------------------------------------------------------
export const getUnpaidBillsOnList =
  async (req: Request, res: Response, next: NextFunction) => {

    // Fetch data from the database
    try {
      const result = await executeQuery(sqlQuery.unpaid_bills_on_list, []);

      return res.status(200).json({
        success: true,
        bills: result.rows
      });

    } catch (error) {
      return res.status(500).json({
        success: false
      });
    }

  };


//---------------------------------------------------------
//              get all Unpaid Bills On List With Account
//---------------------------------------------------------
export const getUnpaidBillsOnListWithAccount =
  async (req: Request, res: Response, next: NextFunction) => {
    const { value, from: FromDate, to: ToDate } = req.body;

    // TODO :  Define the contraint due to the period 
    if (isEmpty(value) || isEmpty(FromDate) || isEmpty(ToDate)) {
      throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);
    }
    // Fetch data from the database
    try {
      const result = await executeQuery(sqlQuery.unpaid_bills_on_list_with_account, [value, FromDate.toString(), ToDate.toString()]);

      return res.status(200).json({
        success: true,
        bills: result.rows
      });
    } catch (error) {
      return res.status(500).json({
        success: false
      });
    }


  };
