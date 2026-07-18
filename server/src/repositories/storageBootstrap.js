import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

async function wipeDirContents(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => fs.rm(path.join(dirPath, entry.name), { recursive: true, force: true }))
  );
}

export async function bootstrapStorage() {
  const { root, uploads, jobs, tmp } = config.storage;
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(uploads, { recursive: true });
  await fs.mkdir(jobs, { recursive: true });
  await fs.mkdir(tmp, { recursive: true });
  await wipeDirContents(tmp);
  logger.info("Storage bootstrapped at", root);
}
