import { Router } from "express";

import { errorHandler } from "../error-handler";
import authMiddleware, { authorizeMiddleware } from "../middlewares/auth";
import { addUserRole, create, get, getById, getCommercialUsers, getPublic, getUserNotification, remove, removeUserRole, update } from "../controllers/user";
import { serviceType } from "../constants/enum";


const serviceName = serviceType.USER;
const userRoutes:Router = Router();

userRoutes.post('/',[authMiddleware,authorizeMiddleware(`${serviceName}-CREATE`)], errorHandler(create));
userRoutes.get('/commercial', [authMiddleware,authorizeMiddleware(`${serviceName}-SEARCH`)],errorHandler(getCommercialUsers));
userRoutes.get('/public', [authMiddleware],errorHandler(getPublic));
userRoutes.get('/', [authMiddleware,authorizeMiddleware(`${serviceName}-READ`)],errorHandler(get));
userRoutes.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', [authMiddleware,authorizeMiddleware(`${serviceName}-READ`)],errorHandler(getById));
userRoutes.put('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-UPDATE`)],errorHandler(update));
userRoutes.delete('/:id', [authMiddleware,authorizeMiddleware(`${serviceName}-DELETE`)],errorHandler(remove));
userRoutes.get('/notifications',[authMiddleware,authorizeMiddleware(`${serviceName}-READNOTIFICATION`,`${serviceName}-NOTIFICATION`)], errorHandler(getUserNotification));

userRoutes.post('/role',[authMiddleware,authorizeMiddleware(`${serviceName}-ADDROLE`,`${serviceName}-ROLE`)], errorHandler(addUserRole));
userRoutes.delete('/role',[authMiddleware,authorizeMiddleware(`${serviceName}-REMOVEROLE`,`${serviceName}-ROLE`)], errorHandler(removeUserRole));

export default userRoutes;