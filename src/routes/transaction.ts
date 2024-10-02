import { Router } from "express";

import { serviceType } from "../constants/enum";
import { errorHandler } from "../error-handler";
import authMiddleware, { authorizeMiddleware } from "../middlewares/auth";
import { create, get, getById, update , remove,softRemove, bulkCreate, bulkSoftRemove  } from "../controllers/transaction";

const serviceName = serviceType.TRANSACTION;
const transactionRoutes:Router = Router();

transactionRoutes.post('/',  [authMiddleware,authorizeMiddleware(`${serviceName}-CREATE`,`${serviceName}-WRITE`)] , errorHandler(create));
transactionRoutes.get('/', [authMiddleware,authorizeMiddleware(`${serviceName}-READ`)] ,errorHandler(get));
transactionRoutes.get('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-READ`)] , errorHandler(getById));
transactionRoutes.put('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-UPDATE`,`${serviceName}-VALIDATE`,`${serviceName}-ASSIGN`,`${serviceName}-WRITE`)], errorHandler(update));
transactionRoutes.delete('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-DELETE`,`${serviceName}-WRITE`)] , errorHandler(softRemove));
transactionRoutes.delete('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-FULLDELETE`)] , errorHandler(remove));

transactionRoutes.post('/bulk',[authMiddleware,authorizeMiddleware(`${serviceName}-BULKCREATE`)] , errorHandler(bulkCreate));
transactionRoutes.delete('/bulk', [authMiddleware,authorizeMiddleware(`${serviceName}-BULKDELETE`)], errorHandler(bulkSoftRemove));


export default transactionRoutes;