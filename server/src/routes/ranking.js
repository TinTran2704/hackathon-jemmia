import { Router } from "express";
import { requireJob } from "./jobs.js";
import * as rankingService from "../services/rankingService.js";

const router = Router({ mergeParams: true });

router.use(requireJob);

router.get("/ranking", async (req, res, next) => {
  try {
    res.json(await rankingService.rank(req.params.jobId));
  } catch (err) {
    next(err);
  }
});

router.post("/evaluate-all", async (req, res, next) => {
  try {
    res.json(await rankingService.evaluateAll(req.params.jobId));
  } catch (err) {
    next(err);
  }
});

export default router;
