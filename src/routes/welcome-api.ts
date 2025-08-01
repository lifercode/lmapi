import express, { type Request, type Response } from "express";

type Router = any;

export const welcomeApiRouter: Router = express.Router();

welcomeApiRouter.get("/", (_req: Request, res: Response) => {
	return res.json({ msg: "Service is healthy" });
});
