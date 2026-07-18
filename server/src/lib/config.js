import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const storageRoot = path.join(serverRoot, "storage");

export const config = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024,
  storage: {
    root: storageRoot,
    jobs: path.join(storageRoot, "jobs"),
    tmp: path.join(storageRoot, "tmp"),
  },
  llm: {
    baseUrl: process.env.LLM_BASE_URL || null,
    apiKey: process.env.LLM_API_KEY || null,
    model: process.env.LLM_MODEL || null,
    get configured() {
      return Boolean(this.baseUrl && this.apiKey && this.model);
    },
  },
};
