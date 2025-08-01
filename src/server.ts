import cors from "cors";
import express, { type Express } from "express";
import { createServer } from "http";
import helmet from "helmet";
import { pino } from "pino";

import { env } from "@/constants/env";
// import { connectSequelize } from "@/services/db/sequelize";
import { setupAppWebsocket } from "@/services/websocket";
import router from "@/routes";

const app: Express = express();
const server = createServer(app);
const corsOptions = { origin: "*", credentials: true };
const urlencodedOptions = { extended: true };
const serverMessage = `Server (${env.NODE_ENV}) running on port http://${env.HOST}:${env.PORT}`;

app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded(urlencodedOptions));
app.use(cors(corsOptions));
app.use(helmet());

app.use(router);

export const logger = pino({
  name: "server start"
});

export const startServer = async () => {
	// await connectSequelize();
	await setupAppWebsocket(server);

	return server.listen(env.PORT, () => logger.info(serverMessage));
};
