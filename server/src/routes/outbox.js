import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { AppError } from "../lib/errors.js";
import { requireJob } from "./jobs.js";
import * as outboxRepo from "../repositories/outboxRepo.js";
import { readProfile } from "../repositories/profileRepo.js";
import * as notificationService from "../services/notificationService.js";
import * as feedbackService from "../services/feedbackService.js";
import * as rankingService from "../services/rankingService.js";

const HrNotifyBody = z.object({
  to: z.string().email(),
});

const FeedbackNotifyBody = z.object({
  to: z.string().email().optional(),
});

const router = Router({ mergeParams: true });

router.use(requireJob);

// GET /api/jobs/:jobId/outbox
router.get("/outbox", async (req, res, next) => {
  try {
    const messages = await outboxRepo.listMessages(req.params.jobId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:jobId/notify/hr
router.post("/notify/hr", async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { to } = HrNotifyBody.parse(req.body);

    const ranking = await rankingService.rank(jobId);
    const topCandidates = ranking.ranked.slice(0, 5);

    const rankedListText = topCandidates
      .map((c, idx) => {
        return `[#${idx + 1}] ${c.fullName || "Unnamed candidate"}
Score: ${c.totalScore}/100 | Recommendation: ${c.recommendation.toUpperCase()}
Top Strength: ${c.topStrength || "None"}
Top Concern: ${c.topConcern || "None"}`;
      })
      .join("\n\n");

    const subject = `[HireKit] Shortlist for "${req.job.title}" — ${ranking.ranked.length} candidates ranked`;
    const bodyText = `HireKit Candidate Shortlist Digest for Job: "${req.job.title}"

TOP CANDIDATES:
${rankedListText || "No candidates ranked yet."}

SUMMARY STATS:
Total evaluated candidates: ${ranking.ranked.length}
Knockout failures: ${ranking.ranked.filter((c) => c.knockoutFailed).length}
Pending evaluation: ${ranking.pending.length}

Please check the HireKit dashboard for more details.`;

    const messageId = nanoid(10);
    let delivery = "demo";
    let status = "stored";

    try {
      delivery = await notificationService.sendMail({ to, subject, bodyText });
      status = delivery === "smtp" ? "sent" : "stored";
    } catch {
      status = "failed";
    }

    const message = {
      id: messageId,
      type: "hr_digest",
      to,
      subject,
      bodyText,
      createdAt: new Date().toISOString(),
      delivery,
      status,
    };

    await outboxRepo.saveMessage(jobId, message);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:jobId/candidates/:candidateId/notify/feedback
router.post("/candidates/:candidateId/notify/feedback", async (req, res, next) => {
  try {
    const { jobId, candidateId } = req.params;
    const { to: bodyTo } = FeedbackNotifyBody.parse(req.body ?? {});

    const profile = await readProfile(jobId, candidateId);
    const to = bodyTo || profile?.email;

    if (!to) {
      throw new AppError("NO_EMAIL", "No email address found for the candidate", 422);
    }

    // Generate feedback content (including guards, low criteria selection, blocklist checks)
    const feedback = await feedbackService.generateFeedback({ jobId, candidateId });

    const subject = feedback.subject;
    const bodyText = feedback.bodyText;

    const messageId = nanoid(10);
    let delivery = "demo";
    let status = "stored";

    try {
      delivery = await notificationService.sendMail({ to, subject, bodyText });
      status = delivery === "smtp" ? "sent" : "stored";
    } catch {
      status = "failed";
    }

    const message = {
      id: messageId,
      type: "candidate_feedback",
      to,
      subject,
      bodyText,
      candidateId,
      createdAt: new Date().toISOString(),
      delivery,
      status,
    };

    await outboxRepo.saveMessage(jobId, message);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

export default router;
