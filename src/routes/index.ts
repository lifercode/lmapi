import { Router } from "express";

import { welcomeApiRouter } from "@/routes/welcome-api";
import { userRouter } from "@/routes/user-router";
import { utilsRouter } from "@/routes/utils-router";
import { companyRouter } from "@/routes/company-router";
import { agentRouter } from "@/routes/agent-router";
import { authRouter } from "@/routes/auth-router";
import { contactRouter } from "@/routes/contact-router";
import { threadRouter } from "@/routes/thread-router";
import { messageRouter } from "@/routes/message-router";

const router = Router();

router.use("/", welcomeApiRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/companies", companyRouter);
router.use("/agents", agentRouter);
router.use("/contacts", contactRouter);
router.use("/threads", threadRouter);
router.use("/messages", messageRouter);
router.use("/utils", utilsRouter);

export default router;
