import path from "node:path";
import fs from "node:fs/promises";
import { config } from "../lib/config.js";
import { writeJsonAtomic, readJson } from "./jsonStore.js";

function outboxDir(jobId) {
  return path.join(config.storage.jobs, jobId, "outbox");
}

function messagePath(jobId, messageId) {
  return path.join(outboxDir(jobId), `${messageId}.json`);
}

export async function saveMessage(jobId, message) {
  const dir = outboxDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  await writeJsonAtomic(messagePath(jobId, message.id), message);
}

export async function getMessage(jobId, messageId) {
  return readJson(messagePath(jobId, messageId));
}

export async function listMessages(jobId) {
  const dir = outboxDir(jobId);
  let files;
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const messages = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readJson(path.join(dir, file)))
  );
  return messages
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
