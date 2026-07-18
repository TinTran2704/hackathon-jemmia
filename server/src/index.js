import express from "express";
import cors from "cors";
import { z } from "zod";
import { config } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { bootstrapStorage } from "./repositories/storageBootstrap.js";
import healthRouter from "./routes/health.js";
import jobsRouter from "./routes/jobs.js";
import cvRouter from "./routes/cv.js";
import candidatesRouter from "./routes/candidates.js";
import criteriaRouter from "./routes/criteria.js";
import rankingRouter from "./routes/ranking.js";
import importCvsRouter from "./routes/importCvs.js";

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/jobs/:jobId/cvs", cvRouter);
app.use("/api/jobs/:jobId/candidates", candidatesRouter);
app.use("/api/jobs/:jobId/criteria", criteriaRouter);
app.use("/api/jobs/:jobId", rankingRouter);
app.use("/api/jobs/:jobId", importCvsRouter);
app.use("/api/jobs", jobsRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError) {
    const message = err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
    return;
  }
  const status = err instanceof AppError ? err.httpStatus : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  if (status >= 500) logger.error(err);
  res.status(status).json({ error: { code, message: err.message } });
});

await bootstrapStorage();

app.listen(config.port, () => {
  logger.info(`HireKit server listening on port ${config.port}`);
});
