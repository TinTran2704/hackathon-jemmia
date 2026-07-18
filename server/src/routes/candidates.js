import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { requireJob } from "./jobs.js";
import { listCandidates, getCvMeta } from "../repositories/cvRepo.js";
import { readProfile } from "../repositories/profileRepo.js";
import { readEvaluation } from "../repositories/evaluationRepo.js";
import * as profileService from "../services/profileService.js";
import * as evaluationService from "../services/evaluationService.js";
import * as interviewKitService from "../services/interviewKitService.js";

const router = Router({ mergeParams: true });

router.use(requireJob);

router.get("/", async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const metas = await listCandidates(jobId);
    const list = await Promise.all(
      metas.map(async (meta) => ({
        meta,
        hasProfile: Boolean(await readProfile(jobId, meta.candidateId)),
      }))
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post("/:candidateId/profile", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const meta = await getCvMeta(jobId, candidateId);
    if (!meta) throw new AppError("CANDIDATE_NOT_FOUND", "Candidate not found", 404);
    const force = req.query.force === "true";
    const profile = await profileService.generate({ jobId, candidateId, force });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

router.get("/:candidateId/profile", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const profile = await readProfile(jobId, candidateId);
    if (!profile) throw new AppError("PROFILE_NOT_FOUND", "Profile not found", 404);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post("/:candidateId/evaluation", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const force = req.query.force === "true";
    const evaluation = await evaluationService.evaluate({ jobId, candidateId, force });
    res.status(201).json(evaluation);
  } catch (err) {
    next(err);
  }
});

router.get("/:candidateId/evaluation", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const evaluation = await readEvaluation(jobId, candidateId);
    if (!evaluation) throw new AppError("EVALUATION_NOT_FOUND", "Evaluation not found", 404);
    res.json(evaluation);
  } catch (err) {
    next(err);
  }
});

router.post("/:candidateId/interview-kit", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const force = req.query.force === "true";
    const kit = await interviewKitService.generate({ jobId, candidateId, force });
    res.status(201).json(kit);
  } catch (err) {
    next(err);
  }
});

router.get("/:candidateId/interview-kit", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const kit = await interviewKitService.get({ jobId, candidateId });
    if (!kit) throw new AppError("INTERVIEW_KIT_NOT_FOUND", "Interview kit not found", 404);
    res.json(kit);
  } catch (err) {
    next(err);
  }
});

export default router;
