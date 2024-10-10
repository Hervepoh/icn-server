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
exports.run_job = exports.update_document_entry_status = exports.add_document_entry = exports.generationIntegrationFile = exports.generationOfIntegrationFile = exports.getICN = exports.getICNGroupes = exports.getICNDematerializeCode = exports.getICNNextCode = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const moment_1 = __importDefault(require("moment"));
const node_cron_1 = __importDefault(require("node-cron"));
const request_1 = require("../constants/request");
const prismadb_1 = __importDefault(require("../libs/prismadb"));
const db_oracle_1 = require("../libs/utils/db.oracle");
const bad_requests_1 = __importDefault(require("../exceptions/bad-requests"));
const http_exception_1 = require("../exceptions/http-exception");
const log_1 = require("../libs/utils/log");
const client_1 = require("@prisma/client");
const internal_exception_1 = __importDefault(require("../exceptions/internal-exception"));
//---------------------------------------------------------
//              GET ICN CODE 
//---------------------------------------------------------
const getICNNextCode = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Fetch data from the database
    const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.icn_next_code);
    // send the response
    return res.status(200).json({
        success: true,
        icn_code: (_a = result.rows[0][0]) !== null && _a !== void 0 ? _a : ""
    });
});
exports.getICNNextCode = getICNNextCode;
//---------------------------------------------------------
//              GET ICN DEMATERIALIZE CODE 
//---------------------------------------------------------
const getICNDematerializeCode = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Fetch data from the database
    const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.icn_next_dematerialisation_code);
    // send the response
    return res.status(200).json({
        success: true,
        dematerialisation: (_a = result.rows[0][0]) !== null && _a !== void 0 ? _a : ""
    });
});
exports.getICNDematerializeCode = getICNDematerializeCode;
//---------------------------------------------------------
//              GET GROUPES
//---------------------------------------------------------
const getICNGroupes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch data from the database
    const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.select_groupes);
    // send the response
    return res.status(200).json({
        success: true,
        groupes: result.rows
    });
});
exports.getICNGroupes = getICNGroupes;
//---------------------------------------------------------
//              GET GROUPES
//---------------------------------------------------------
const getICN = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: icn_number, type } = req.body;
    // TODO :  Define the contraint due to the period 
    if (!icn_number) {
        throw new bad_requests_1.default("Invalid parameters", http_exception_1.ErrorCode.INVALID_DATA);
    }
    let query = "";
    let value = [];
    switch (type) {
        case "full":
            query = request_1.sqlQuery.icn_fulldata;
            value = [icn_number];
            break;
        case "light":
            query = request_1.sqlQuery.icn_lightdata;
            value = [icn_number, icn_number, icn_number];
            break;
        default:
            query = request_1.sqlQuery.icn_infos;
            value = [icn_number];
            break;
    }
    const result = yield (0, db_oracle_1.executeQuery)(query, value);
    // send the response
    return res.status(200).json({
        success: true,
        data: result.rows
    });
});
exports.getICN = getICN;
//---------------------------------------------------------
//             GENERATE USING API
//---------------------------------------------------------
const generationOfIntegrationFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filePath = (0, exports.generationIntegrationFile)();
        // send the response
        return res.status(200).json({
            success: true,
            file: `CSV file generated at ${filePath}`
        });
    }
    catch (error) {
        throw new internal_exception_1.default("Somethiing when wron", error, http_exception_1.ErrorCode.INTERNAL_EXCEPTION);
    }
});
exports.generationOfIntegrationFile = generationOfIntegrationFile;
//-----------------------------------------------
//        generationIntegrationFile
//-----------------------------------------------  
const generationIntegrationFile = () => __awaiter(void 0, void 0, void 0, function* () {
    (0, log_1.writeLogEntry)('JOB : generationIntegrationFile --> start', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
    // Fetch data from the database
    const documents = yield prismadb_1.default.integrationDocument.findMany({
        where: { integration_status: client_1.EventIntegrationType.WAIT_GENERATION }
    });
    // Early exit if no documents found
    if (documents.length === 0) {
        (0, log_1.writeLogEntry)('JOB : generationIntegrationFile --> No documents with WAIT_GENERATION status found.', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
        (0, log_1.writeLogEntry)('JOB : generationIntegrationFile --> end', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
        return null;
    }
    // Création du contenu du fichier CSV
    let csvContent = `File Generated on=${(0, moment_1.default)().format('ddd MMM DD HH:mm:ss Z YYYY')}\nData for Date=${(0, moment_1.default)().format('DD/MM/YYYY')}|5701473|640816|3\n`;
    csvContent += 'Transaction_ID|Sub_transaction_Type|Bill_Partner_Company_name|Bill_partner_company_code|Bill_Number|Bill_Account_Number|Bill_Due_Date|Paid_Amount|Paid_Date|Paid_By_MSISDN|Transaction_Status|OM_Bill_Payment_Status\n';
    documents.forEach((doc) => {
        csvContent += `${doc.transaction_id}|${doc.sub_transaction_type}|${doc.bill_partner_company_name}|${doc.bill_partner_company_code}|${doc.bill_number}|${doc.bill_account_number}||${doc.paid_amount}|${doc.paid_date}|${doc.paid_by_msisdn}|${doc.transaction_status}|${doc.om_bill_payment_status}\n`;
    });
    // Génération du nom de fichier
    const timestamp = (0, moment_1.default)().format('MMDDYYYYHHmmss');
    const fileName = `AES_${timestamp}_PAIDBILLS.csv`;
    // Génération du chemin du fichier
    const outputDir = path_1.default.join(__dirname, '../../output');
    const filePath = path_1.default.join(outputDir, fileName);
    // Créer le répertoire 'output' s'il n'existe pas
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir);
    }
    // Écriture du fichier
    fs_1.default.writeFileSync(filePath, csvContent);
    // Update the status of each document in the documents array to ONGOING
    const documentIds = documents.map(doc => doc.id); // Extract the IDs of the documents
    yield prismadb_1.default.integrationDocument.updateMany({
        where: { id: { in: documentIds } },
        data: { integration_status: client_1.EventIntegrationType.GENERATED }
    });
    (0, log_1.writeLogEntry)(`JOB : generationIntegrationFile --> updateMany ${documentIds.length} integrationDocument to GENERATED`, log_1.LogLevel.INFO, log_1.LogType.GENERAL, documentIds);
    (0, log_1.writeLogEntry)('JOB : generationIntegrationFile --> end', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
    return filePath;
});
exports.generationIntegrationFile = generationIntegrationFile;
//-----------------------------------------------
//        add_document_entry
//-----------------------------------------------  
const add_document_entry = () => __awaiter(void 0, void 0, void 0, function* () {
    (0, log_1.writeLogEntry)('JOB : add_document_entry --> start', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
    try {
        const documents = yield prismadb_1.default.$queryRaw `
      SELECT td.*,t.reference
      FROM transaction_details td
      JOIN transactions t ON td.transactionId = t.id
      WHERE t.statusId = 8
        AND td.selected = 1
        AND td.id NOT IN (SELECT transactionDetailsId FROM integration_documents)
    `;
        // If no documents found, exit early
        if (documents.length === 0) {
            (0, log_1.writeLogEntry)('JOB : add_document_entry --> No documents to process.', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
            (0, log_1.writeLogEntry)('JOB : add_document_entry --> end', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
            return;
        }
        // Batch check existing documents
        const existingIds = yield prismadb_1.default.integrationDocument.findMany({
            where: {
                transactionDetailsId: { in: documents.map((doc) => doc.id) }
            },
            select: { transactionDetailsId: true }
        }).then(existing => existing.map(doc => doc.transactionDetailsId));
        // Prepare data for creation
        const integrationDocuments = documents
            .filter((document) => !existingIds.includes(document.id))
            .map((document, index) => ({
            reference: document.reference,
            transactionId: document.transactionId,
            transactionDetailsId: document.id,
            transaction_id: `AC${(0, moment_1.default)().format('DDMMYYYY')}.${(0, moment_1.default)().format('HHmm')}.I${String(index + 1).padStart(5, '0')}`,
            sub_transaction_type: "BILL Payment",
            bill_partner_company_name: "AES",
            bill_partner_company_code: "AES",
            bill_number: document.invoice,
            bill_account_number: document.contract,
            bill_due_date: " ", // Handle appropriately
            paid_amount: document.amountTopaid.toString(),
            paid_date: (0, moment_1.default)().format('DD/MM/YYYY HH:mm:ss'),
            paid_by_msisdn: "724113114",
            transaction_status: "Success",
            om_bill_payment_status: "Bill Paid",
            integration_status: client_1.EventIntegrationType.WAIT_GENERATION
        }));
        // Create documents in a single batch operation
        if (integrationDocuments.length > 0) {
            yield prismadb_1.default.integrationDocument.createMany({ data: integrationDocuments });
            (0, log_1.writeLogEntry)(`JOB : add_document_entry --> Created ${integrationDocuments.length} new integration documents.`, log_1.LogLevel.INFO, log_1.LogType.GENERAL, integrationDocuments);
        }
        // for (const document of documents) {
        //   const exist = await prismaClient.integrationDocument.findFirst({
        //     where: { transactionDetailsId: document.id }
        //   });
        //   if (!exist) {
        //     let currentNumber = 1;
        //     const data = {
        //       reference: document.reference, // Adjust as needed
        //       transactionId: document.transactionId, // Ensure this matches your data
        //       transactionDetailsId: document.id, // Ensure this matches your data
        //       transaction_id: `AC${moment().format('DDMMYYYY')}.${moment().format('HHmm')}.I${String(currentNumber).padStart(5, '0')}`, // Ensure this matches your data
        //       sub_transaction_type: "BILL Payment",
        //       bill_partner_company_name: "AES",
        //       bill_partner_company_code: "AES",
        //       bill_number: document.invoice,
        //       bill_account_number: document.contract,
        //       bill_due_date: " ", // Make sure this is handled appropriately
        //       paid_amount: document.amountTopaid.toString(),
        //       paid_date: moment().format('DD/MM/YYYY HH:mm:ss'),
        //       paid_by_msisdn: "724113114", // Adjust as needed
        //       transaction_status: "Success",
        //       om_bill_payment_status: "Bill Paid",
        //       integration_status: EventIntegrationType.PENDING
        //     };
        //     await prismaClient.integrationDocument.create({ data });
        //     currentNumber++;
        //     writeLogEntry(`creating new integration document ref: ${document.reference}`, LogLevel.INFO, LogType.GENERAL, data);
        //   } else {
        //     writeLogEntry("Document already exists", LogLevel.ERROR, LogType.GENERAL, [exist]);
        //   }
        // }
        (0, log_1.writeLogEntry)('JOB : add_document_entry --> end', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
    }
    catch (error) {
        (0, log_1.writeLogEntry)("JOB : add_document_entry --> Fail to generate document", log_1.LogLevel.ERROR, log_1.LogType.GENERAL, [error]);
    }
});
exports.add_document_entry = add_document_entry;
//---------------------------------------------------------
//         update_document_entry_status
//---------------------------------------------------------
const update_document_entry_status = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    (0, log_1.writeLogEntry)('JOB : update_document_entry_status --> start', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
    try {
        const documents = yield prismadb_1.default.$queryRaw `
    SELECT *
    FROM transactions t 
    JOIN transaction_details td ON td.transactionId = t.id
    JOIN integration_documents id ON td.id = id.transactionDetailsId
    WHERE t.statusId = 8
    AND td.selected = 1
  `;
        // Early exit if no documents found
        if (documents.length === 0) {
            (0, log_1.writeLogEntry)('JOB : update_document_entry_status --> No documents to process.', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
            (0, log_1.writeLogEntry)('JOB : update_document_entry_status --> end', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
            return null;
        }
        const statusMap = {
            '0S001': client_1.EventIntegrationType.ONGOING,
            '0S002': client_1.EventIntegrationType.ONGOING_WITH_ISSUE,
            'OS005': client_1.EventIntegrationType.INTEGRATED
        };
        const transactionStatusUpdates = {};
        // loop on all transactions and documents
        for (const document of documents) {
            //console.log(document);
            const result = yield (0, db_oracle_1.executeQuery)(request_1.sqlQuery.icn_search_bill_status, [document.bill_number]);
            const statusKey = ((_b = (_a = result === null || result === void 0 ? void 0 : result.rows) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b[1]) || null;
            let newStatus;
            if (statusKey && statusMap[statusKey]) {
                newStatus = statusMap[statusKey];
                yield prismadb_1.default.integrationDocument.update({
                    where: { id: document.id },
                    data: { integration_status: newStatus }
                });
            }
            else {
                newStatus = client_1.EventIntegrationType.PENDING;
                (0, log_1.writeLogEntry)(`JOB : update_document_entry_status --> Unknown status key: ${statusKey} for document ID: ${document.id}.`, log_1.LogLevel.INFO);
                yield prismadb_1.default.integrationDocument.update({
                    where: { id: document.id },
                    data: { integration_status: newStatus }
                });
            }
            // Track the integration status for the transaction
            const transactionId = document.transactionId;
            if (!transactionStatusUpdates[transactionId]) {
                transactionStatusUpdates[transactionId] = [];
            }
            transactionStatusUpdates[transactionId].push({
                id: document.id,
                status: newStatus
            });
        }
        // Update each transaction if all associated integration documents are INTEGRATED
        const updatePromises = Object.keys(transactionStatusUpdates).map((transactionId) => __awaiter(void 0, void 0, void 0, function* () {
            const statuses = transactionStatusUpdates[transactionId];
            const allIntegrated = statuses.every(item => item.status === client_1.EventIntegrationType.INTEGRATED);
            if (allIntegrated) {
                const updatedTransaction = yield prismadb_1.default.transaction.update({
                    where: { id: transactionId },
                    data: { statusId: 9 }
                });
                //Notify the key account manager and the person who create the transaction
                // Prepare notifications for the key account manager and the user who created the transaction
                const usersToNotify = [
                    { id: updatedTransaction.userId, subject: "Transaction Treated and Integrated", message: `Transaction ID: ${updatedTransaction.reference} has been processed and integrated into the CMS. You can edit the fog (Brouillard) for more details.` },
                    { id: updatedTransaction.createdBy, subject: "Transaction Treated and Integrated", message: `Your transaction ID: ${updatedTransaction.reference} has been processed and integrated into the CMS. You can edit the fog (Brouillard) for more details.` }
                ];
                // Notify users
                yield Promise.all(usersToNotify.map((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, subject, message }) {
                    if (id) {
                        const user = yield prismadb_1.default.user.findFirst({ where: { id } });
                        if (user) {
                            yield prismadb_1.default.notification.create({
                                data: {
                                    email: user.email,
                                    message,
                                    method: client_1.NotificationMethod.EMAIL,
                                    subject,
                                    template: "notification.mail.ejs",
                                },
                            });
                        }
                    }
                })));
                (0, log_1.writeLogEntry)('JOB : update_document_entry_status --> updaye', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
            }
        }));
        // Wait for all updates to complete
        yield Promise.all(updatePromises);
        (0, log_1.writeLogEntry)('JOB : update_document_entry_status --> end', log_1.LogLevel.INFO, log_1.LogType.GENERAL);
    }
    catch (error) {
        (0, log_1.writeLogEntry)("JOB : update_document_entry_status --> Fail to update document entry", log_1.LogLevel.ERROR, log_1.LogType.GENERAL, [error]);
    }
});
exports.update_document_entry_status = update_document_entry_status;
//-----------------------------------------------
//        add_document_entry document
//-----------------------------------------------
node_cron_1.default.schedule('* * * * * *', () => __awaiter(void 0, void 0, void 0, function* () { return yield (0, exports.run_job)("add_document_entry", exports.add_document_entry); }));
//---------------------------------------------------------
//              generate_document
//---------------------------------------------------------
node_cron_1.default.schedule('0 */2 * * * *', () => __awaiter(void 0, void 0, void 0, function* () { return yield (0, exports.run_job)("generate_document", exports.generationIntegrationFile); }));
//-----------------------------------------------
//        update_document_entry_status document
//-----------------------------------------------
node_cron_1.default.schedule('* * * * * *', () => __awaiter(void 0, void 0, void 0, function* () { return yield (0, exports.run_job)("update_document_entry_status", exports.update_document_entry_status); }));
const run_job = (job_name, job) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lock = yield prismadb_1.default.jobLock.findUnique({ where: { job_name } });
        // Ensure the lock entry exists
        if (!lock) {
            const init = yield prismadb_1.default.jobLock.upsert({
                where: { job_name },
                update: {},
                create: { job_name, is_running: false }
            });
            (0, log_1.writeLogEntry)(`JOB : ${job_name} first initialisation`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE, init);
            return;
        }
        // Check if the job is already running
        if (lock.is_running) {
            (0, log_1.writeLogEntry)(`JOB : ${job_name} is already running. Exiting...`, log_1.LogLevel.ERROR, log_1.LogType.DATABASE);
            return; // Exit if another instance is running
        }
        // Set the lock to true
        yield prismadb_1.default.jobLock.update({
            where: { job_name },
            data: { is_running: true }
        });
        job();
    }
    catch (error) {
        (0, log_1.writeLogEntry)("Fail to generate document", log_1.LogLevel.ERROR, log_1.LogType.GENERAL, [error]);
    }
    finally {
        //TODO remove this 
        // // Sleep function
        //const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
        // // Sleep for 5 minutes (300,000 milliseconds)
        // await sleep(100000); // 5 minutes
        // Release the lock
        yield prismadb_1.default.jobLock.update({
            where: { job_name },
            data: { is_running: false }
        });
    }
});
exports.run_job = run_job;
