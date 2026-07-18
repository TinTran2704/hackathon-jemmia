import { Router } from "express";
import { config } from "../lib/config.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    llm: config.llm.configured ? "configured" : "missing",
    r2: config.r2.configured ? "configured" : "missing",
    mail: config.smtp.configured ? "smtp" : "demo",
  });
});

export default router;
