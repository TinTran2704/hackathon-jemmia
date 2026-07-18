import { Router } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import * as jobsRepo from "../repositories/jobsRepo.js";

const CreateJobBody = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
});

export async function requireJob(req, res, next) {
  try {
    const job = await jobsRepo.getById(req.params.jobId);
    if (!job) throw new AppError("JOB_NOT_FOUND", "Job not found", 404);
    req.job = job;
    next();
  } catch (err) {
    next(err);
  }
}

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const body = CreateJobBody.parse(req.body);
    const job = await jobsRepo.create(body);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    res.json(await jobsRepo.list());
  } catch (err) {
    next(err);
  }
});

router.get("/:jobId", requireJob, (req, res) => {
  res.json(req.job);
});

export default router;
