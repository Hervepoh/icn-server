import { Router } from "express";

import { errorHandler } from "../error-handler";
import { addUserRole, create, get, getUserNotification, removeUserRole } from "../controllers/user";

const userRoutes:Router = Router();

userRoutes.post('/', errorHandler(create));
userRoutes.get('/', errorHandler(get));
userRoutes.get('/notifications', errorHandler(getUserNotification));

userRoutes.post('/role', errorHandler(addUserRole));
userRoutes.delete('/role', errorHandler(removeUserRole));

export default userRoutes;