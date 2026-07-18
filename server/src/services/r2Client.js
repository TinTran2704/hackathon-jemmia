import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKey,
      secretAccessKey: config.r2.secretKey,
    },
  });
}

function requireConfigured() {
  if (!config.r2.configured) {
    throw new AppError("STORAGE_NOT_CONFIGURED", "R2 storage is not configured", 503);
  }
}

function inferContentType(key) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

export async function listObjects(prefix = "") {
  requireConfigured();
  try {
    const client = getClient();
    const command = new ListObjectsV2Command({ Bucket: config.r2.bucket, Prefix: prefix });
    const result = await client.send(command);
    return (result.Contents ?? [])
      .filter((obj) => obj.Key && !obj.Key.endsWith("/"))
      .map((obj) => ({ key: obj.Key, size: obj.Size ?? 0 }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("STORAGE_UPSTREAM", `R2 list failed: ${err.message}`, 502);
  }
}

export async function getObject(key) {
  requireConfigured();
  try {
    const client = getClient();
    const command = new GetObjectCommand({ Bucket: config.r2.bucket, Key: key });
    const result = await client.send(command);
    const buffer = Buffer.from(await result.Body.transformToByteArray());
    const contentType = result.ContentType || inferContentType(key);
    return { buffer, contentType };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("STORAGE_UPSTREAM", `R2 download failed for "${key}": ${err.message}`, 502);
  }
}
