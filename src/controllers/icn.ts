import { NextFunction, Request, Response } from "express";
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import cron from "node-cron";

import { sqlQuery } from "../constants/request";
import prismaClient from "../libs/prismadb";
import { executeQuery, getConnection, releaseConnection } from "../libs/utils/db.oracle";
import BadRequestException from "../exceptions/bad-requests";
import { ErrorCode } from "../exceptions/http-exception";
import { LogLevel, LogType, writeLogEntry } from "../libs/utils/log";
import { EventIntegrationType, NotificationMethod } from "@prisma/client";
import InternalException from "../exceptions/internal-exception";


//---------------------------------------------------------
//              GET ICN CODE 
//---------------------------------------------------------
export const getICNNextCode =
  async (req: Request, res: Response, next: NextFunction) => {

    // Fetch data from the database
    const result = await executeQuery(sqlQuery.icn_next_code);

    // send the response
    return res.status(200).json({
      success: true,
      icn_code: result.rows[0][0] ?? ""
    });

  };


//---------------------------------------------------------
//              GET ICN DEMATERIALIZE CODE 
//---------------------------------------------------------
export const getICNDematerializeCode =
  async (req: Request, res: Response, next: NextFunction) => {

    // Fetch data from the database
    const result = await executeQuery(sqlQuery.icn_next_dematerialisation_code);

    // send the response
    return res.status(200).json({
      success: true,
      dematerialisation: result.rows[0][0] ?? ""
    });

  };


//---------------------------------------------------------
//              GET GROUPES
//---------------------------------------------------------
export const getICNGroupes =
  async (req: Request, res: Response, next: NextFunction) => {

    // Fetch data from the database
    const result = await executeQuery(sqlQuery.select_groupes);

    // send the response
    return res.status(200).json({
      success: true,
      groupes: result.rows
    });

  };


//---------------------------------------------------------
//              GET GROUPES
//---------------------------------------------------------
export const getICN =
  async (req: Request, res: Response, next: NextFunction) => {

    const { id: icn_number, type } = req.body
    // TODO :  Define the contraint due to the period 
    if (!icn_number) {
      throw new BadRequestException("Invalid parameters", ErrorCode.INVALID_DATA);
    }

    let query = "";
    let value: string[] = [];
    switch (type) {
      case "full":
        query = sqlQuery.icn_fulldata
        value = [icn_number];
        break;
      case "light":
        query = sqlQuery.icn_lightdata
        value = [icn_number, icn_number, icn_number];
        break;
      default:
        query = sqlQuery.icn_infos;
        value = [icn_number];
        break;
    }
    const result = await executeQuery(query, value);

    // send the response
    return res.status(200).json({
      success: true,
      data: result.rows
    });


  };


//---------------------------------------------------------
//             GENERATE USING API
//---------------------------------------------------------
export const generationOfIntegrationFile =
  async (req: Request, res: Response, next: NextFunction) => {

    try {
      const filePath = generationIntegrationFile();
      // send the response
      return res.status(200).json({
        success: true,
        file: `CSV file generated at ${filePath}`
      });
    } catch (error) {
      throw new InternalException("Somethiing when wron", error, ErrorCode.INTERNAL_EXCEPTION)
    }
  };


//-----------------------------------------------
//        generationIntegrationFile
//-----------------------------------------------  
export const generationIntegrationFile = async () => {

  writeLogEntry('JOB : generationIntegrationFile --> start', LogLevel.INFO, LogType.GENERAL);

  // Fetch data from the database
  const documents = await prismaClient.integrationDocument.findMany({
    where: { integration_status: EventIntegrationType.WAIT_GENERATION }
  });

  // Early exit if no documents found
  if (documents.length === 0) {
    writeLogEntry('JOB : generationIntegrationFile --> No documents with WAIT_GENERATION status found.', LogLevel.INFO, LogType.GENERAL);
    writeLogEntry('JOB : generationIntegrationFile --> end', LogLevel.INFO, LogType.GENERAL);
    return null;
  }

  // Création du contenu du fichier CSV
  let csvContent = `File Generated on=${moment().format('ddd MMM DD HH:mm:ss Z YYYY')}\nData for Date=${moment().format('DD/MM/YYYY')}|5701473|640816|3\n`;
  csvContent += 'Transaction_ID|Sub_transaction_Type|Bill_Partner_Company_name|Bill_partner_company_code|Bill_Number|Bill_Account_Number|Bill_Due_Date|Paid_Amount|Paid_Date|Paid_By_MSISDN|Transaction_Status|OM_Bill_Payment_Status\n';

  documents.forEach((doc) => {
    csvContent += `${doc.transaction_id}|${doc.sub_transaction_type}|${doc.bill_partner_company_name}|${doc.bill_partner_company_code}|${doc.bill_number}|${doc.bill_account_number}||${doc.paid_amount}|${doc.paid_date}|${doc.paid_by_msisdn}|${doc.transaction_status}|${doc.om_bill_payment_status}\n`;
  });

  // Génération du nom de fichier
  const timestamp = moment().format('MMDDYYYYHHmmss');
  const fileName = `AES_${timestamp}_PAIDBILLS.csv`;

  // Génération du chemin du fichier
  const outputDir = path.join(__dirname, '../../output');
  const filePath = path.join(outputDir, fileName);

  // Créer le répertoire 'output' s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Écriture du fichier
  fs.writeFileSync(filePath, csvContent);

  // Update the status of each document in the documents array to ONGOING
  const documentIds = documents.map(doc => doc.id); // Extract the IDs of the documents
  await prismaClient.integrationDocument.updateMany({
    where: { id: { in: documentIds } },
    data: { integration_status: EventIntegrationType.GENERATED }
  });

  writeLogEntry(`JOB : generationIntegrationFile --> updateMany ${documentIds.length} integrationDocument to GENERATED`, LogLevel.INFO, LogType.GENERAL, documentIds);
  writeLogEntry('JOB : generationIntegrationFile --> end', LogLevel.INFO, LogType.GENERAL);

  return filePath;

}


//-----------------------------------------------
//        add_document_entry
//-----------------------------------------------  
export const add_document_entry = async () => {

  writeLogEntry('JOB : add_document_entry --> start', LogLevel.INFO, LogType.GENERAL);
  try {
    const documents: any = await prismaClient.$queryRaw`
      SELECT td.*,t.reference
      FROM transaction_details td
      JOIN transactions t ON td.transactionId = t.id
      WHERE t.statusId = 8
        AND td.selected = 1
        AND td.id NOT IN (SELECT transactionDetailsId FROM integration_documents)
    `;

    // If no documents found, exit early
    if (documents.length === 0) {
      writeLogEntry('JOB : add_document_entry --> No documents to process.', LogLevel.INFO, LogType.GENERAL);
      writeLogEntry('JOB : add_document_entry --> end', LogLevel.INFO, LogType.GENERAL);
      return;
    }

    // Batch check existing documents
    const existingIds = await prismaClient.integrationDocument.findMany({
      where: {
        transactionDetailsId: { in: documents.map((doc: any) => doc.id) }
      },
      select: { transactionDetailsId: true }
    }).then(existing => existing.map(doc => doc.transactionDetailsId));


    // Prepare data for creation
    const integrationDocuments = documents
      .filter((document: any) => !existingIds.includes(document.id))
      .map((document: any, index: any) => ({
        reference: document.reference,
        transactionId: document.transactionId,
        transactionDetailsId: document.id,
        transaction_id: `AC${moment().format('DDMMYYYY')}.${moment().format('HHmm')}.I${String(index + 1).padStart(5, '0')}`,
        sub_transaction_type: "BILL Payment",
        bill_partner_company_name: "AES",
        bill_partner_company_code: "AES",
        bill_number: document.invoice,
        bill_account_number: document.contract,
        bill_due_date: " ", // Handle appropriately
        paid_amount: document.amountTopaid.toString(),
        paid_date: moment().format('DD/MM/YYYY HH:mm:ss'),
        paid_by_msisdn: "724113114",
        transaction_status: "Success",
        om_bill_payment_status: "Bill Paid",
        integration_status: EventIntegrationType.WAIT_GENERATION
      }));

    // Create documents in a single batch operation
    if (integrationDocuments.length > 0) {
      await prismaClient.integrationDocument.createMany({ data: integrationDocuments });
      writeLogEntry(`JOB : add_document_entry --> Created ${integrationDocuments.length} new integration documents.`, LogLevel.INFO, LogType.GENERAL, integrationDocuments);
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
    writeLogEntry('JOB : add_document_entry --> end', LogLevel.INFO, LogType.GENERAL);
  } catch (error) {
    writeLogEntry("JOB : add_document_entry --> Fail to generate document", LogLevel.ERROR, LogType.GENERAL, [error]);
  }
};


//---------------------------------------------------------
//         update_document_entry_status
//---------------------------------------------------------
export const update_document_entry_status = async () => {
  writeLogEntry('JOB : update_document_entry_status --> start', LogLevel.INFO, LogType.GENERAL);
  try {
    const documents: any = await prismaClient.$queryRaw`
    SELECT *
    FROM transactions t 
    JOIN transaction_details td ON td.transactionId = t.id
    JOIN integration_documents id ON td.id = id.transactionDetailsId
    WHERE t.statusId = 8
    AND td.selected = 1
  `;

    // Early exit if no documents found
    if (documents.length === 0) {
      writeLogEntry('JOB : update_document_entry_status --> No documents to process.', LogLevel.INFO, LogType.GENERAL);
      writeLogEntry('JOB : update_document_entry_status --> end', LogLevel.INFO, LogType.GENERAL);
      return null;
    }

    const statusMap: { [key: string]: EventIntegrationType } = {
      '0S001': EventIntegrationType.ONGOING,
      '0S002': EventIntegrationType.ONGOING_WITH_ISSUE,
      'OS005': EventIntegrationType.INTEGRATED
    };

    const transactionStatusUpdates: { [transactionId: string]: { id: number, status: EventIntegrationType }[] } = {};

    // loop on all transactions and documents
    for (const document of documents) {
      //console.log(document);
      const result = await executeQuery(sqlQuery.icn_search_bill_status, [document.bill_number]);
      const statusKey = result?.rows?.[0]?.[1] || null;

      let newStatus;

      if (statusKey && statusMap[statusKey]) {
        newStatus = statusMap[statusKey];
        await prismaClient.integrationDocument.update({
          where: { id: document.id },
          data: { integration_status: newStatus }
        });
      } else {
        newStatus = EventIntegrationType.PENDING;
        writeLogEntry(`JOB : update_document_entry_status --> Unknown status key: ${statusKey} for document ID: ${document.id}.`, LogLevel.INFO);
        await prismaClient.integrationDocument.update({
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
    const updatePromises = Object.keys(transactionStatusUpdates).map(async (transactionId) => {
      const statuses = transactionStatusUpdates[transactionId];
      const allIntegrated = statuses.every(item => item.status === EventIntegrationType.INTEGRATED);

      if (allIntegrated) {
        const updatedTransaction = await prismaClient.transaction.update({
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
        await Promise.all(usersToNotify.map(async ({ id, subject, message }) => {
          if (id) {
            const user = await prismaClient.user.findFirst({ where: { id } });
            if (user) {
              await prismaClient.notification.create({
                data: {
                  email: user.email,
                  message,
                  method: NotificationMethod.EMAIL,
                  subject,
                  template: "notification.mail.ejs",
                },
              });
            }
          }
        }));

        writeLogEntry('JOB : update_document_entry_status --> updaye', LogLevel.INFO, LogType.GENERAL,);
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    writeLogEntry('JOB : update_document_entry_status --> end', LogLevel.INFO, LogType.GENERAL);
  } catch (error) {
    writeLogEntry("JOB : update_document_entry_status --> Fail to update document entry", LogLevel.ERROR, LogType.GENERAL, [error]);
  }
};



//-----------------------------------------------
//        add_document_entry document
//-----------------------------------------------
cron.schedule('* * * * * *', async () => await run_job("add_document_entry", add_document_entry));


//---------------------------------------------------------
//              generate_document
//---------------------------------------------------------
cron.schedule('0 */2 * * * *', async () => await run_job("generate_document", generationIntegrationFile));


//-----------------------------------------------
//        update_document_entry_status document
//-----------------------------------------------
cron.schedule('* * * * * *', async () => await run_job("update_document_entry_status", update_document_entry_status));



export const run_job = async (job_name: string, job: Function) => {
  try {
    const lock = await prismaClient.jobLock.findUnique({ where: { job_name } });

    // Ensure the lock entry exists
    if (!lock) {
      const init = await prismaClient.jobLock.upsert({
        where: { job_name },
        update: {},
        create: { job_name, is_running: false }
      });
      writeLogEntry(`JOB : ${job_name} first initialisation`, LogLevel.ERROR, LogType.DATABASE, init);
      return
    }

    // Check if the job is already running
    if (lock.is_running) {
      writeLogEntry(`JOB : ${job_name} is already running. Exiting...`, LogLevel.ERROR, LogType.DATABASE);
      return; // Exit if another instance is running
    }

    // Set the lock to true
    await prismaClient.jobLock.update({
      where: { job_name },
      data: { is_running: true }
    });

    job();

  } catch (error) {
    writeLogEntry("Fail to generate document", LogLevel.ERROR, LogType.GENERAL, [error]);
  } finally {
    //TODO remove this 
    // // Sleep function
    //const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
    // // Sleep for 5 minutes (300,000 milliseconds)
    // await sleep(100000); // 5 minutes

    // Release the lock
    await prismaClient.jobLock.update({
      where: { job_name },
      data: { is_running: false }
    });
  }
}


