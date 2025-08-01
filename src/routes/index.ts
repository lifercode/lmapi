import { Router } from "express";

import { welcomeApiRouter } from "@/routes/welcome-api";
import { userRouter } from "@/routes/user-router";
import { utilsRouter } from "@/routes/utils-router";
import { companyRouter } from "@/routes/company-router";

const router = Router();

router.use("/", welcomeApiRouter);
router.use("/users", userRouter);
router.use("/companies", companyRouter);
router.use("/utils", utilsRouter);

export default router;
