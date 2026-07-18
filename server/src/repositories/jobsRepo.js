import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { config } from "../lib/config.js";
import { readJson, writeJsonAtomic } from "./jsonStore.js";
import { JobSchema } from "../schemas/job.schema.js";

function jobFile(jobId) {
  return path.join(config.storage.jobs, jobId, "job.json");
}

export async function create({ title, description }) {
  const job = JobSchema.parse({
    id: nanoid(10),
    title,
    description,
    createdAt: new Date().toISOString(),
    status: "open",
  });
  await writeJsonAtomic(jobFile(job.id), job);
  return job;
}

export async function getById(jobId) {
  return readJson(jobFile(jobId));
}

export async function list() {
  await fs.mkdir(config.storage.jobs, { recursive: true });
  const entries = await fs.readdir(config.storage.jobs, { withFileTypes: true });
  const jobs = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => getById(entry.name))
  );
  return jobs.filter(Boolean);
}
