import { listCandidates } from "../repositories/cvRepo.js";
import { readProfile } from "../repositories/profileRepo.js";
import { readEvaluation } from "../repositories/evaluationRepo.js";
import { readCriteria } from "../repositories/criteriaRepo.js";
import * as profileService from "./profileService.js";
import * as evaluationService from "./evaluationService.js";

export async function rank(jobId) {
  const criteria = await readCriteria(jobId);
  const metas = await listCandidates(jobId);

  const ranked = [];
  const pending = [];

  for (const meta of metas) {
    const profile = await readProfile(jobId, meta.candidateId);
    if (!profile) {
      pending.push({ candidateId: meta.candidateId, fullName: null, reason: "no_profile" });
      continue;
    }

    const evaluation = await readEvaluation(jobId, meta.candidateId);
    if (!evaluation) {
      pending.push({ candidateId: meta.candidateId, fullName: profile.fullName, reason: "no_evaluation" });
      continue;
    }

    ranked.push({
      candidateId: meta.candidateId,
      fullName: profile.fullName,
      totalScore: evaluation.totalScore,
      recommendation: evaluation.recommendation,
      knockoutFailed: evaluation.knockoutFailed,
      topStrength: evaluation.strengths[0] ?? null,
      topConcern: evaluation.concerns[0] ?? null,
      stale: Boolean(criteria) && evaluation.criteriaVersion !== criteria.generatedAt,
    });
  }

  ranked.sort((a, b) => {
    if (a.knockoutFailed !== b.knockoutFailed) return a.knockoutFailed ? 1 : -1;
    return b.totalScore - a.totalScore;
  });

  return {
    jobId,
    criteriaVersion: criteria?.generatedAt ?? null,
    ranked,
    pending,
  };
}

export async function evaluateAll(jobId) {
  const metas = await listCandidates(jobId);
  const done = [];
  const failed = [];

  for (const meta of metas) {
    try {
      let profile = await readProfile(jobId, meta.candidateId);
      if (!profile) {
        profile = await profileService.generate({ jobId, candidateId: meta.candidateId });
      }
      await evaluationService.evaluate({ jobId, candidateId: meta.candidateId });
      done.push(meta.candidateId);
    } catch (err) {
      failed.push({ candidateId: meta.candidateId, code: err.code ?? "UNKNOWN_ERROR" });
    }
  }

  return { done, failed };
}
