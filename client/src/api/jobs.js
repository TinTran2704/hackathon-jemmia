import { get, post, patch } from "./http.js";

export function listJobs() {
  return get("/jobs");
}

export function createJob({ title, description }) {
  return post("/jobs", { title, description });
}

export function getJob(jobId) {
  return get(`/jobs/${jobId}`);
}

export function getCriteria(jobId) {
  return get(`/jobs/${jobId}/criteria`);
}

export function generateCriteria(jobId, { force = false } = {}) {
  return post(`/jobs/${jobId}/criteria${force ? "?force=true" : ""}`);
}

export function patchCriteriaWeights(jobId, weights) {
  return patch(`/jobs/${jobId}/criteria`, { weights });
}

export function importCvs(jobId, { prefix = "" } = {}) {
  return post(`/jobs/${jobId}/import-cvs`, { prefix });
}

export function evaluateAll(jobId) {
  return post(`/jobs/${jobId}/evaluate-all`);
}

export function rescore(jobId) {
  return post(`/jobs/${jobId}/rescore`);
}

export function getRanking(jobId) {
  return get(`/jobs/${jobId}/ranking`);
}
