import { Router } from "express";

import { welcomeApiRouter } from "@/routes/welcome-api";

const router = Router();

router.use("/", welcomeApiRouter);

export default router;
