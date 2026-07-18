import express from "express";
import cors from "cors";
import { config } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { bootstrapStorage } from "./repositories/storageBootstrap.js";
import healthRouter from "./routes/health.js";
import cvRouter from "./routes/cv.js";

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/cv", cvRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err instanceof AppError ? err.httpStatus : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  if (status >= 500) logger.error(err);
  res.status(status).json({ error: { code, message: err.message } });
});

await bootstrapStorage();

app.listen(config.port, () => {
  logger.info(`HireKit server listening on port ${config.port}`);
});
