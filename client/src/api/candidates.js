import { get, post } from "./http.js";

export function listCandidates(jobId) {
  return get(`/jobs/${jobId}/candidates`);
}

export function uploadCv(jobId, file) {
  const formData = new FormData();
  formData.append("cv", file);
  return post(`/jobs/${jobId}/cvs`, formData);
}

export function generateProfile(jobId, candidateId, { force = false } = {}) {
  return post(`/jobs/${jobId}/candidates/${candidateId}/profile${force ? "?force=true" : ""}`);
}

export function getProfile(jobId, candidateId) {
  return get(`/jobs/${jobId}/candidates/${candidateId}/profile`);
}

export function generateEvaluation(jobId, candidateId, { force = false } = {}) {
  return post(`/jobs/${jobId}/candidates/${candidateId}/evaluation${force ? "?force=true" : ""}`);
}

export function getEvaluation(jobId, candidateId) {
  return get(`/jobs/${jobId}/candidates/${candidateId}/evaluation`);
}
