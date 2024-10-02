import { Router } from "express";

import { serviceType } from "../constants/enum";
import { errorHandler } from "../error-handler";
import authMiddleware, { authorizeMiddleware } from "../middlewares/auth";
import {  get, getById, update , getByName  } from "../controllers/status";

const statusRoutes:Router = Router();

statusRoutes.get('/', [authMiddleware] ,errorHandler(get));


export default statusRoutes;