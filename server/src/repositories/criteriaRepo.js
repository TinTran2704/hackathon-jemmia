import path from "node:path";
import { config } from "../lib/config.js";
import { readJson, writeJsonAtomic } from "./jsonStore.js";

function criteriaPath(jobId) {
  return path.join(config.storage.jobs, jobId, "criteria.json");
}

export async function readCriteria(jobId) {
  return readJson(criteriaPath(jobId));
}

export async function writeCriteria(jobId, criteria) {
  await writeJsonAtomic(criteriaPath(jobId), criteria);
}
