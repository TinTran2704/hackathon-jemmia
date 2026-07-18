import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { requireJob } from "./jobs.js";
import * as criteriaService from "../services/criteriaService.js";

const router = Router({ mergeParams: true });

router.use(requireJob);

router.post("/", async (req, res, next) => {
  try {
    const force = req.query.force === "true";
    const criteria = await criteriaService.getOrGenerate({
      jobId: req.params.jobId,
      description: req.job.description,
      force,
    });
    res.status(201).json(criteria);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const criteria = await criteriaService.get(req.params.jobId);
    if (!criteria) throw new AppError("CRITERIA_NOT_FOUND", "Criteria not found for this job", 404);
    res.json(criteria);
  } catch (err) {
    next(err);
  }
});

export default router;
