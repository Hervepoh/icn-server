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
exports.getUnpaidBillsOnListWithAccount = exports.getUnpaidBillsOnList = exports.getUnpaidBillsByCustomerName = exports.getUnpaidBillsByCustomerRegroupNumber = exports.getUnpaidBillsByContractNumber = exports.getUnpaidBillsByInvoiceNumber = exports.getUnpaidBills = void 0;
const date_fns_1 = require("date-fns");
const request_1 = require("../constants/request");
const formatter_1 = require("../libs/utils/formatter");
const db_oracle_1 = require("../libs/utils/db.oracle");
const log_1 = require("../libs/utils/log");
const http_exception_1 = require("../exceptions/http-exception");
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
//---------------------------------------------------------
//              get all Unpaid Bills Using Query Parameters
//---------------------------------------------------------
const getUnpaidBills = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get Query Parameters
    const { by: searchBy, type } = req.query;
    const searchType = (_a = type === null || type === void 0 ? void 0 : type.toString()) !== null && _a !== void 0 ? _a : "one";
    // check user information
    const authorizeSearchBy = ["invoice", "contract", "regroup", "customer"];
    const authorizeType = ["many", "one"];
    const orderBy = ["asc", "desc"];
    const limit = ["10", "50", "100"];
    if (!searchBy)
        throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
    if (searchBy) {
        if (!authorizeSearchBy.includes(searchBy.toString())) {
            throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
        }
        if (!authorizeType.includes(searchType.toString())) {
            throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
        }
    }
    switch (searchBy) {
        case "invoice":
            (0, exports.getUnpaidBillsByInvoiceNumber)(req, res, next);
            break;
        case "contract":
            (0, exports.getUnpaidBillsByContractNumber)(req, res, next);
            break;
        case "regroup":
            (0, exports.getUnpaidBillsByCustomerRegroupNumber)(req, res, next);
            break;
        case "customer":
            (0, exports.getUnpaidBillsByCustomerName)(req, res, next);
            break;
        default:
            return res.status(200).json({
                success: true,
                bills: []
            });
            break;
    }
});
exports.getUnpaidBills = getUnpaidBills;
//---------------------------------------------------------
//              get all Unpaid Bills By Invoice Number 
//---------------------------------------------------------
const getUnpaidBillsByInvoiceNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        connection = yield (0, db_oracle_1.getConnection)();
        const result = yield connection.execute(request_1.sqlQuery.unpaid_bills_by_invoice_number, [invoice_number.toString().trim()]);
        // send the response
        res.status(200).json({
            success: true,
            bills: result.rows
        });
    }
    catch (error) {
        // Catch the error and return and error respons
        (0, log_1.writeLogEntry)('Internal error:', log_1.LogLevel.ERROR, log_1.LogType.DATABASE, error.message);
        console.log("UNPAID-INVOICE", error);
        return res.status(200).json({
            success: false,
            bills: [],
            message: 'Internal error'
        });
        // throw new InternalException(error.message, error, ErrorCode.INTERNAL_EXCEPTION);
    }
    finally {
        // close the connection to the database
        if (connection) {
            yield (0, db_oracle_1.releaseConnection)(connection);
        }
    }
});
exports.getUnpaidBillsByInvoiceNumber = getUnpaidBillsByInvoiceNumber;
//---------------------------------------------------------
//              get all Unpaid Bills By Contract Number 
//---------------------------------------------------------
const getUnpaidBillsByContractNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
        const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.unpaid_bills_by_contract_number, [
            contract_number.toString().trim(),
            (0, date_fns_1.format)((_a = FromDate.toString()) !== null && _a !== void 0 ? _a : new Date(), "dd/MM/yyyy"),
            (0, date_fns_1.format)((_b = ToDate.toString()) !== null && _b !== void 0 ? _b : new Date(), "dd/MM/yyyy")
        ]); // send the response
        return res.status(200).json({
            success: true,
            bills: result.rows
        });
    }
    catch (error) {
        // Catch the error and return and error respons
        (0, log_1.writeLogEntry)('Internal error:', log_1.LogLevel.ERROR, log_1.LogType.DATABASE, error);
        console.log("UNPAID-CONTRACT", error);
        return res.status(200).json({
            success: false,
            bills: [],
            message: 'Internal error'
        });
    }
});
exports.getUnpaidBillsByContractNumber = getUnpaidBillsByContractNumber;
//---------------------------------------------------------
//              get all Unpaid Bills By CustomerRegroup Number 
//---------------------------------------------------------
const getUnpaidBillsByCustomerRegroupNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
        const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.unpaid_bills_by_customer_regroup_number, [
            value.toString().trim(),
            (0, date_fns_1.format)((_a = FromDate.toString()) !== null && _a !== void 0 ? _a : new Date(), "dd/MM/yyyy"),
            (0, date_fns_1.format)((_b = ToDate.toString()) !== null && _b !== void 0 ? _b : new Date(), "dd/MM/yyyy")
        ]);
        console.log(result);
        return res.status(200).json({
            success: true,
            bills: result.rows
        });
    }
    catch (error) {
        (0, log_1.writeLogEntry)('Internal error:', log_1.LogLevel.ERROR, log_1.LogType.DATABASE, error);
        console.log("UNPAID-REGROUP", error);
        return res.status(200).json({
            success: false,
            bills: [],
            message: 'Internal error'
        });
    }
});
exports.getUnpaidBillsByCustomerRegroupNumber = getUnpaidBillsByCustomerRegroupNumber;
//---------------------------------------------------------
//              get all Unpaid Bills By Customer Name
//---------------------------------------------------------
const getUnpaidBillsByCustomerName = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { value, from: FromDate, to: ToDate } = req.query;
    // TODO :  Define the contraint due to params
    if ((0, formatter_1.isEmpty)(value) || (0, formatter_1.isEmpty)(FromDate) || (0, formatter_1.isEmpty)(ToDate)) {
        throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
    }
    if (!FromDate || !ToDate) {
        throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
    }
    // console.log("value", [
    //   value,
    //   format(FromDate.toString(), "dd/MM/yyyy"),
    //   format(ToDate.toString(), "dd/MM/yyyy")
    // ])
    // Fetch data from the database
    try {
        const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.unpaid_bills_by_customer_name, [value, FromDate.toString(), ToDate.toString()]);
        return res.status(200).json({
            success: true,
            bills: result.rows
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false
        });
    }
});
exports.getUnpaidBillsByCustomerName = getUnpaidBillsByCustomerName;
//---------------------------------------------------------
//              get all Unpaid Bills On List
//---------------------------------------------------------
const getUnpaidBillsOnList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch data from the database
    try {
        const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.unpaid_bills_on_list, []);
        return res.status(200).json({
            success: true,
            bills: result.rows
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false
        });
    }
});
exports.getUnpaidBillsOnList = getUnpaidBillsOnList;
//---------------------------------------------------------
//              get all Unpaid Bills On List With Account
//---------------------------------------------------------
const getUnpaidBillsOnListWithAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { value, from: FromDate, to: ToDate } = req.body;
    // TODO :  Define the contraint due to the period 
    if ((0, formatter_1.isEmpty)(value) || (0, formatter_1.isEmpty)(FromDate) || (0, formatter_1.isEmpty)(ToDate)) {
        throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
    }
    // Fetch data from the database
    try {
        const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.unpaid_bills_on_list_with_account, [value, FromDate.toString(), ToDate.toString()]);
        return res.status(200).json({
            success: true,
            bills: result.rows
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false
        });
    }
});
exports.getUnpaidBillsOnListWithAccount = getUnpaidBillsOnListWithAccount;
