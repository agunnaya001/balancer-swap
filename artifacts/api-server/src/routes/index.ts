import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dexRouter from "./dex";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dexRouter);

export default router;
