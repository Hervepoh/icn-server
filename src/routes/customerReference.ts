import { Router } from "express";

import { serviceType } from "../constants/enum";
import { errorHandler } from "../error-handler";
import authMiddleware, { authorizeMiddleware } from "../middlewares/auth";
import { create, get, getById, update , remove, bulkCreate, bulkRemove  } from "../controllers/customerReference";

const serviceName = serviceType.CUSTOMERSREFERENCES;
const customersReferenceRoutes:Router = Router();

customersReferenceRoutes.post('/', [authMiddleware,authorizeMiddleware(`${serviceName}-CREATE`)] , errorHandler(create));
customersReferenceRoutes.get('/', [authMiddleware] ,errorHandler(get));
customersReferenceRoutes.get('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-READ`)] , errorHandler(getById));
customersReferenceRoutes.put('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-UPDATE`)], errorHandler(update));
customersReferenceRoutes.delete('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-DELETE`)] , errorHandler(remove));

customersReferenceRoutes.post('/bulk',[authMiddleware,authorizeMiddleware(`${serviceName}-BULKCREATE`)] , errorHandler(bulkCreate));
customersReferenceRoutes.delete('/bulk', [authMiddleware,authorizeMiddleware(`${serviceName}-BULKDELETE`)], errorHandler(bulkRemove));

export default customersReferenceRoutes;