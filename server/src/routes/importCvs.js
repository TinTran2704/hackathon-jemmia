import { Router } from "express";
import { z } from "zod";
import { requireJob } from "./jobs.js";
import * as cvImportService from "../services/cvImportService.js";

const ImportBody = z.object({
  prefix: z.string().optional().default(""),
});

const router = Router({ mergeParams: true });

router.use(requireJob);

router.post("/import-cvs", async (req, res, next) => {
  try {
    const { prefix } = ImportBody.parse(req.body ?? {});
    const result = await cvImportService.importFromR2({ jobId: req.params.jobId, prefix });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
