import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../lib/errors.js";
import { stripFences } from "../lib/stripFences.js";

// Single-flight queue: free-tier providers rate-limit hard, so only one
// request is ever in flight regardless of how many callers show up.
let tail = Promise.resolve();

function runExclusive(task) {
  const result = tail.then(task, task);
  tail = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function callProvider({ system, user, maxTokens }) {
  let res;
  try {
    res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    throw new AppError("LLM_UPSTREAM", `Network error contacting LLM provider: ${err.message}`, 502);
  }
  return res;
}

async function doComplete({ system, user, maxTokens }, isRetry) {
  const start = Date.now();
  const res = await callProvider({ system, user, maxTokens });

  if (res.status === 429) {
    if (isRetry) {
      throw new AppError("LLM_RATE_LIMITED", "LLM provider rate limit exceeded", 429);
    }
    const retryAfterHeader = res.headers.get("retry-after");
    const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 5000;
    await sleep(Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 5000);
    return doComplete({ system, user, maxTokens }, true);
  }

  if (!res.ok) {
    const bodyText = await safeText(res);
    throw new AppError("LLM_UPSTREAM", `LLM provider returned ${res.status}: ${bodyText}`, 502);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError("LLM_UPSTREAM", "LLM provider returned no content", 502);
  }

  logger.info(`LLM call model=${config.llm.model} latencyMs=${Date.now() - start}`);
  return content;
}

export async function complete({ system, user, maxTokens = 1500 }) {
  if (!config.llm.configured) {
    throw new AppError("LLM_NOT_CONFIGURED", "LLM provider is not configured", 503);
  }
  return runExclusive(() => doComplete({ system, user, maxTokens }, false));
}

export async function completeJson({ system, user, schema, maxTokens = 1500 }) {
  const raw = await complete({ system, user, maxTokens });
  try {
    return schema.parse(JSON.parse(stripFences(raw)));
  } catch (firstErr) {
    const repairUser = `${user}\n\nYour previous output failed validation: ${firstErr.message}. Return corrected raw JSON only.`;
    const raw2 = await complete({ system, user: repairUser, maxTokens });
    try {
      return schema.parse(JSON.parse(stripFences(raw2)));
    } catch (secondErr) {
      throw new AppError(
        "LLM_BAD_OUTPUT",
        `LLM output failed validation after retry: ${secondErr.message}`,
        502
      );
    }
  }
}
