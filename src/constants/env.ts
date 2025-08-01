import dotenv from "dotenv";
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
	NODE_ENV: z.string(),
	HOST: z.string(),
	PORT: z.string().transform(Number),
	MONGO_CONNECTION: z.string(),
});

export const env = envSchema.parse(process.env);
