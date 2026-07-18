import { Router } from "express";
import { config } from "../lib/config.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", llm: config.llm.configured ? "configured" : "missing" });
});

export default router;
