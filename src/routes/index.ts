import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./user";
import roleRoutes from "./role";
import bankRoutes from "./bank";
import permissionRoutes from "./permission";
import paymentModeRoutes from "./paymentMode";
import interncreditRoutes from "./interncredit";
import unpaidRoutes from "./unpaid";
import transactionRoutes from "./transaction";
import transactionDetailRoutes from "./transaction-detail";
import summaryRoutes from "./summary";
import notificationRoutes from "./notification";
import statusRoutes from "./status";
import unpaidOrPaidRoutes from "./unpaidOrPaid";
import customersReferenceRoutes from "./customerReference";
import segmentRoutes from "./segment";
import unitRoutes from "./unit";
import regionRoutes from "./region";

const rootRouter:Router = Router();

rootRouter.use('/auth' , authRoutes);
rootRouter.use('/users' , userRoutes);
rootRouter.use('/roles' , roleRoutes);
rootRouter.use('/permissions' , permissionRoutes);
rootRouter.use('/status' , statusRoutes);

rootRouter.use('/summary' , summaryRoutes);
rootRouter.use('/banks' , bankRoutes);
rootRouter.use('/pay-modes' , paymentModeRoutes);
rootRouter.use('/segments' , segmentRoutes);
rootRouter.use('/units' , unitRoutes);
rootRouter.use('/regions' , regionRoutes);
rootRouter.use('/requests' , transactionRoutes);
rootRouter.use('/requests-details' , transactionDetailRoutes);
rootRouter.use('/search-unpaid' , unpaidRoutes);
rootRouter.use('/search-paid-or-unpaid' , unpaidOrPaidRoutes);
rootRouter.use('/icn' , interncreditRoutes);
rootRouter.use('/notifications' , notificationRoutes);
rootRouter.use('/customers-reference' , customersReferenceRoutes);

export default rootRouter;