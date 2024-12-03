import { Router } from "express";

import { serviceType } from "../constants/enum";
import { errorHandler } from "../error-handler";
import authMiddleware, { authorizeMiddleware } from "../middlewares/auth";
import { create, get, getById, update, remove, softRemove, bulkCreate, bulkSoftRemove, qualityAssurance, } from "../controllers/transaction";
import { addLock, getLock, removeLock } from "../controllers/transactions-lock";
import { exportData } from "../controllers/transaction-export";

const serviceName = serviceType.TRANSACTION;
const transactionRoutes: Router = Router();

transactionRoutes.post('/', [authMiddleware, authorizeMiddleware(`${serviceName}-CREATE`, `${serviceName}-WRITE`)], errorHandler(create));
transactionRoutes.get('/', [authMiddleware, authorizeMiddleware(`${serviceName}-READ`)], errorHandler(get));
transactionRoutes.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [authMiddleware, authorizeMiddleware(`${serviceName}-READ`)], errorHandler(getById));
transactionRoutes.put('/:id', [authMiddleware, authorizeMiddleware(`${serviceName}-UPDATE`, `${serviceName}-VALIDATE`, `${serviceName}-ASSIGN`, `${serviceName}-WRITE`, `${serviceName}-COMMERCIAL`)], errorHandler(update));
transactionRoutes.delete('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [authMiddleware, authorizeMiddleware(`${serviceName}-DELETE`, `${serviceName}-WRITE`)], errorHandler(softRemove));
transactionRoutes.delete('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [authMiddleware, authorizeMiddleware(`${serviceName}-FULLDELETE`)], errorHandler(remove));

transactionRoutes.post('/bulk', [authMiddleware, authorizeMiddleware(`${serviceName}-BULKCREATE`)], errorHandler(bulkCreate));
transactionRoutes.delete('/bulk', [authMiddleware, authorizeMiddleware(`${serviceName}-BULKDELETE`)], errorHandler(bulkSoftRemove));

transactionRoutes.get('/export/:id', [authMiddleware], errorHandler(exportData));
transactionRoutes.post('/quality-assurance/:id', [authMiddleware], errorHandler(qualityAssurance));

transactionRoutes.get('/lock', errorHandler(getLock));
transactionRoutes.post('/lock', [authMiddleware], errorHandler(addLock));
transactionRoutes.delete('/lock', [authMiddleware], errorHandler(removeLock));

export default transactionRoutes;